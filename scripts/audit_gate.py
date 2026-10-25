#!/usr/bin/env python3
"""Version-bound coverage for lecture-engine courses; never grants manual approval."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET


def digest(value):
    return hashlib.sha256(value).hexdigest()


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def inside(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise ValueError(f"Нет допустимого файла внутри проекта: {relative}")
    return path


def read(root, relative):
    return json.loads(inside(root, relative).read_text(encoding="utf-8"))


def file_hash(root, relative):
    return digest(inside(root, relative).read_bytes())


def runtime_files(root, paths):
    files = {}
    for relative in paths:
        path = (root / relative).resolve()
        if not path.is_relative_to(root) or not path.exists() or path.is_symlink():
            raise ValueError(f"Недопустимый runtime: {relative}")
        candidates = sorted(path.rglob("*")) if path.is_dir() else [path]
        for candidate in candidates:
            if candidate.is_symlink():
                raise ValueError(f"Runtime содержит ссылку: {candidate}")
            if candidate.is_file() and "__pycache__" not in candidate.parts:
                key = candidate.relative_to(root).as_posix()
                files[key] = file_hash(root, key)
    if not files:
        raise ValueError("Не указаны файлы реализации показа")
    return files


def asset_hashes(root, relative, seen=None):
    seen = seen if seen is not None else set()
    if relative in seen:
        return {}
    seen.add(relative)
    path = inside(root, relative)
    result = {relative: file_hash(root, relative)}
    if path.suffix.lower() not in {".svg", ".css"}:
        return result
    source = path.read_text(encoding="utf-8")
    references = re.findall(r"url\(\s*['\"]?([^)'\"]+)", source)
    if path.suffix.lower() == ".svg":
        try:
            svg = ET.fromstring(source)
        except ET.ParseError as exc:
            raise ValueError(f"Нечитаемый SVG: {relative}") from exc
        references.extend(value for node in svg.iter() for key, value in node.attrib.items()
                          if key == "href" or key.endswith("}href"))
    for ref in references:
        if ref.startswith(("#", "data:")):
            continue
        if re.match(r"^[a-z]+:", ref, re.I) or ref.startswith(("/", "\\")):
            raise ValueError(f"Внешняя зависимость артефакта не закреплена: {ref}")
        target = (path.parent / ref.split("#")[0].split("?")[0]).resolve()
        if not target.is_relative_to(root):
            raise ValueError(f"Зависимость артефакта вне проекта: {ref}")
        result.update(asset_hashes(root, target.relative_to(root).as_posix(), seen))
    return result


def image_files(root, value):
    result = {}
    if isinstance(value, dict):
        for key, item in value.items():
            if key == "image" and isinstance(item, str):
                if re.match(r"^[a-z]+:", item, re.I) or item.startswith("/"):
                    raise ValueError(f"Сначала сохраните и проверьте внешний артефакт: {item}")
                path = "public/" + item
                result.update(asset_hashes(root, path))
            else:
                result.update(image_files(root, item))
    elif isinstance(value, list):
        for item in value:
            result.update(image_files(root, item))
    return result


def inventory(root, course_path, pack_path, runtime):
    course, pack = read(root, course_path), read(root, pack_path)
    lectures, notes = course.get("lectures"), pack.get("notes")
    if not isinstance(lectures, list) or not lectures or not isinstance(notes, dict):
        raise ValueError("Нужны непустой course.lectures и teacher-pack.notes")
    if course.get("id") != pack.get("courseId") or course.get("contentVersion") != pack.get("contentVersion"):
        raise ValueError("Курс и заметки относятся к разным курсам или редакциям")
    runtime_hashes = runtime_files(root, runtime)
    units, seen = [], set()
    for lecture in lectures:
        groups, current = [], {"id": lecture["id"] + ":intro", "slides": []}
        for slide in lecture["slides"]:
            sid = slide["id"]
            if sid in seen or sid not in notes or not isinstance(notes[sid].get("script"), str) or not notes[sid]["script"].strip():
                raise ValueError(f"Повтор ID или нет речи преподавателя: {sid}")
            seen.add(sid)
            question = re.search(r"-(Q\d+)$", sid) if slide.get("kind") == "section" else None
            tail = sid == lecture["id"] + "-experiment"
            if question or tail:
                if current["slides"]:
                    groups.append(current)
                current = {"id": lecture["id"] + ":" + (question[1] if question else "closing"), "slides": []}
            current["slides"].append(slide)
        if current["slides"]:
            groups.append(current)
        for group in groups:
            slides = group["slides"]
            images = image_files(root, slides)
            subset_notes = {s["id"]: notes[s["id"]] for s in slides}
            needs = ["student", "teacher"]
            if any(s.get("visual") or s.get("steps") or s.get("rows") for s in slides):
                needs.append("visual")
            if any(s.get("kind") == "test" or s["id"].endswith(("-practice", "-experiment")) for s in slides):
                needs.append("behavior")
            units.append({"id": group["id"], "lectureId": lecture["id"],
                          "slideIds": [s["id"] for s in slides], "needs": needs,
                          "artifacts": images,
                          "fingerprint": digest(canonical({"slides": slides, "notes": subset_notes,
                                                           "course": {k: v for k, v in course.items() if k != "lectures"},
                                                           "lecture": {k: v for k, v in lecture.items() if k != "slides"},
                                                           "artifacts": images, "runtime": runtime_hashes}))})
    if set(notes) != seen:
        raise ValueError("В пакете есть заметки для отсутствующих слайдов")
    return {"schemaVersion": 1, "courseId": course["id"], "contentVersion": course.get("contentVersion"),
            "inputs": {"course": course_path, "pack": pack_path, "runtime": runtime},
            "runtimeHashes": runtime_hashes, "units": units,
            "counts": {"lectures": len(lectures), "slides": len(seen), "units": len(units)}}


def check(root, saved, reviews, selected=()):
    args = saved["inputs"]
    actual = inventory(root, args["course"], args["pack"], args["runtime"])
    failures, covered = [], []
    if actual != saved:
        failures.append({"id": "inventory", "reason": "Карта устарела; заново снимите текущий состав"})
    records = reviews.get("reviews")
    if reviews.get("schemaVersion") != 1 or not isinstance(records, list):
        raise ValueError("Неподдерживаемая карта результатов аудита")
    by_id = {}
    for record in records:
        if record["id"] in by_id:
            raise ValueError("Повтор результата: " + record["id"])
        by_id[record["id"]] = record
    known = {u["id"] for u in actual["units"]}
    if set(by_id) - known or set(selected) - known:
        raise ValueError("Результат или выборка ссылается на неизвестный блок")
    for unit in actual["units"]:
        uid = unit["id"]
        if selected and uid not in selected:
            continue
        record = by_id.get(uid)
        reasons = []
        if not record:
            reasons.append("Блок не проверен")
        elif record.get("fingerprint") != unit["fingerprint"]:
            reasons.append("Изменились слайды, заметки, артефакты или реализация")
        else:
            if record.get("issues") != []:
                reasons.append("Не закрыты дефекты или не указан список issues")
            for name in unit["needs"]:
                result = record.get("checks", {}).get(name, {})
                if result.get("status") != "passed" or not result.get("note", "").strip():
                    reasons.append(name + ": нет содержательного результата")
                    continue
                evidence = result.get("evidence", [])
                if not evidence:
                    reasons.append(name + ": нет доказательства")
                for item in evidence:
                    try:
                        if file_hash(root, item["path"]) != item["sha256"]:
                            reasons.append(name + ": доказательство изменилось: " + item["path"])
                    except (ValueError, KeyError):
                        reasons.append(name + ": доказательство отсутствует или некорректно")
        if reasons:
            failures.append({"id": uid, "reason": "; ".join(reasons)})
        else:
            covered.append(uid)
    return {"schemaVersion": 1, "courseId": actual["courseId"], "contentVersion": actual["contentVersion"],
            "scope": "subset" if selected else "full", "inventorySha256": digest(canonical(actual)),
            "counts": actual["counts"], "checked": covered, "failures": failures,
            "status": "passed" if not failures else "incomplete"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    inv = sub.add_parser("inventory")
    inv.add_argument("--course", required=True)
    inv.add_argument("--pack", required=True)
    inv.add_argument("--runtime", nargs="+", required=True)
    review = sub.add_parser("check")
    review.add_argument("--inventory", required=True)
    review.add_argument("--reviews", required=True)
    review.add_argument("--units", nargs="+", default=[])
    for child in (inv, review):
        child.add_argument("--root", type=Path, required=True)
        child.add_argument("--out", required=True)
    args = parser.parse_args()
    root = args.root.resolve(strict=True)
    result = inventory(root, args.course, args.pack, args.runtime) if args.command == "inventory" else check(
        root, read(root, args.inventory), read(root, args.reviews), args.units)
    output = (root / args.out).resolve()
    if not output.is_relative_to(root):
        raise ValueError("Выходной файл должен находиться внутри проекта")
    if output in [root / p for p in [getattr(args, "course", ""), getattr(args, "pack", ""),
                                    getattr(args, "reviews", ""), getattr(args, "inventory", "")]]:
        raise ValueError("Нельзя перезаписать входной файл")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes((json.dumps(result, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(json.dumps({"counts": result["counts"], "status": result.get("status", "inventory"),
                      "scope": result.get("scope"), "gaps": len(result.get("failures", []))}, ensure_ascii=False))
    return 0 if result.get("status", "passed") == "passed" else 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print("Ошибка аудита: " + str(exc), file=sys.stderr)
        sys.exit(2)
