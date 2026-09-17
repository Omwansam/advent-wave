#!/usr/bin/env python3
"""
Validates <repo>/contracts against itself. Exit code 1 on any failure.

  1. every examples/kafka/<topic>.<shape>.json validates against kafka/<topic>/schema.json
  2. every examples/api/<name>.json validates against the matching operation's response schema
     in openapi/adventwave.yaml (status code, path template, method)
  3. openapi info.version == VERSION
  4. every kafka topic in Topics.java has a schema directory, and vice versa

Drift against the *implementation* (regenerate schema.sql / adventwave.yaml and diff) is a
separate CI job because it needs a database and a running gateway; see contracts/README.md.
"""
import json, pathlib, re, sys
import yaml, jsonschema

ROOT = pathlib.Path(__file__).resolve().parents[2] / "contracts"
failures = []

def fail(msg): failures.append(msg); print(f"  FAIL  {msg}")
def ok(msg):   print(f"  ok    {msg}")

# ---------------------------------------------------------------- 1. kafka examples
print("kafka examples")
for ex in sorted((ROOT / "examples" / "kafka").glob("*.json")):
    topic = ex.name[: -len(".json")].rsplit(".", 1)[0]
    schema_path = ROOT / "kafka" / topic / "schema.json"
    if not schema_path.exists():
        fail(f"{ex.name}: no schema at kafka/{topic}/schema.json"); continue
    doc = json.loads(ex.read_text())
    try:
        jsonschema.Draft202012Validator(json.loads(schema_path.read_text()),
                                        format_checker=jsonschema.FormatChecker()).validate(doc["value"])
        ok(ex.name)
    except jsonschema.ValidationError as e:
        fail(f"{ex.name}: {e.message}")

# ---------------------------------------------------------------- 2. api examples
print("api examples")
spec = yaml.safe_load((ROOT / "openapi" / "adventwave.yaml").read_text())
components = spec["components"]["schemas"]

def template_to_regex(t): return re.compile("^" + re.sub(r"\{[^}]+\}", r"[^/]+", t) + "$")
templates = [(template_to_regex(p), p) for p in spec["paths"]]

def resolve(schema):
    # Inline $refs so a plain JSON Schema validator can walk OpenAPI component schemas.
    if isinstance(schema, dict):
        if "$ref" in schema:
            return resolve(components[schema["$ref"].rsplit("/", 1)[1]])
        return {k: resolve(v) for k, v in schema.items()}
    if isinstance(schema, list): return [resolve(x) for x in schema]
    return schema

for ex in sorted((ROOT / "examples" / "api").glob("*.json")):
    doc = json.loads(ex.read_text()); req, res = doc["request"], doc["response"]
    path = req["path"].split("?")[0]
    match = next((t for rx, t in templates if rx.match(path)), None)
    if not match:
        fail(f"{ex.name}: path {path} matches no operation"); continue
    op = spec["paths"][match].get(req["method"].lower())
    if not op:
        fail(f"{ex.name}: {req['method']} not defined on {match}"); continue
    code = str(res["status"])
    if code not in op["responses"]:
        fail(f"{ex.name}: status {code} not declared on {req['method']} {match} (declared: {list(op['responses'])})"); continue
    if (op.get("security") == []) == req["authenticated"] and code != "401":
        fail(f"{ex.name}: example authenticated={req['authenticated']} but operation is {'public' if op.get('security') == [] else 'bearer'}")
    content = op["responses"][code].get("content", {})
    if "body" in res:
        if not content:
            fail(f"{ex.name}: response {code} declares no body but example has one"); continue
        schema = resolve(next(iter(content.values()))["schema"])
        try:
            jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker()).validate(res["body"])
            ok(f"{ex.name}  ({req['method']} {match} → {code})")
        except jsonschema.ValidationError as e:
            fail(f"{ex.name}: {'/'.join(map(str, e.absolute_path)) or '<root>'}: {e.message[:120]}")
    else:
        ok(f"{ex.name}  ({req['method']} {match} → {code}, no body)")

# ---------------------------------------------------------------- 3. version
print("version")
v = (ROOT / "VERSION").read_text().strip()
if spec["info"]["version"] == v: ok(f"VERSION {v} == openapi info.version")
else: fail(f"VERSION is {v} but openapi info.version is {spec['info']['version']}")

# ---------------------------------------------------------------- 4. topic registry
print("topic registry")
topics_java = (ROOT.parent / "backend/contracts/src/main/java/org/adventwave/contracts/events/Topics.java").read_text()
in_code = set(re.findall(r'"([a-z]+\.[a-z]+\.v\d+)"', topics_java))
on_disk = {p.name for p in (ROOT / "kafka").iterdir() if p.is_dir()}
for t in sorted(in_code | on_disk):
    if t in in_code and t in on_disk: ok(t)
    else: fail(f"{t}: {'in Topics.java only' if t in in_code else 'on disk only'}")

print(f"\n{len(failures)} failure(s)")
sys.exit(1 if failures else 0)
