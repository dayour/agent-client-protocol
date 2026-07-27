#!/usr/bin/env python3
"""
Generates registry documentation from the ACP Agent Registry CDN.

This script fetches the registry.json from the CDN and generates
an MDX page with agent cards for the documentation site.

Usage:
    python scripts/generate_registry_docs.py

Environment variables:
    REGISTRY_URL: Override the default registry URL
    ICON_BASE_URL: Override the default icon base URL
    REGISTRY_TEMPLATE_PATH: Override the template path
    REGISTRY_OUTPUT_PATH: Override the output path
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlsplit

DEFAULT_REGISTRY_URL = "https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json"
DEFAULT_ICON_BASE_URL = "https://cdn.agentclientprotocol.com/registry/v1/latest"

ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"
DEFAULT_TEMPLATE_PATH = DOCS_DIR / "get-started" / "_registry_agents.mdx"
DEFAULT_OUTPUT_PATH = DOCS_DIR / "get-started" / "registry.mdx"
PLACEHOLDER = "$$AGENTS_CARDS$$"

SVG_NAMESPACE = "http://www.w3.org/2000/svg"
MAX_AGENT_ID_LENGTH = 128
MAX_NAME_LENGTH = 200
MAX_DESCRIPTION_LENGTH = 2_000
MAX_VERSION_LENGTH = 64
MAX_URL_LENGTH = 2_048
MAX_SVG_BYTES = 100_000
MAX_SVG_ATTR_LENGTH = MAX_SVG_BYTES
CONTROL_CHAR_RE = re.compile(r"[\x00-\x1F\x7F]")
SAFE_AGENT_ID_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,127})$")
SAFE_SVG_ID_RE = re.compile(r"^[-A-Za-z_][-A-Za-z0-9_.:]*$")
INTERNAL_SVG_URL_RE = re.compile(r"^url\(#[-A-Za-z_][-A-Za-z0-9_.:]*\)$")
INTERNAL_SVG_HREF_RE = re.compile(r"^#[-A-Za-z_][-A-Za-z0-9_.:]*$")

# Allow only inert vector primitives and defs commonly needed by small icons.
# This intentionally excludes elements that can execute script, embed HTML, or
# fetch external resources, such as script, style, foreignObject, iframe,
# object, embed, and image. Internal fragment reuse via <use href="#..."> is
# allowed because it stays within the same sanitized document and cannot fetch
# remote content.
SVG_ALLOWED_ELEMENTS = {
    "svg",
    "g",
    "path",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "rect",
    "defs",
    "clipPath",
    "mask",
    "linearGradient",
    "radialGradient",
    "stop",
    "use",
    "text",
    "tspan",
    "title",
}

SVG_ATTR_REPLACEMENTS = {
    "fill-rule": "fillRule",
    "clip-rule": "clipRule",
    "clip-path": "clipPath",
    "stroke-width": "strokeWidth",
    "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin",
    "stroke-miterlimit": "strokeMiterlimit",
    "stroke-dasharray": "strokeDasharray",
    "stroke-dashoffset": "strokeDashoffset",
    "stroke-opacity": "strokeOpacity",
    "fill-opacity": "fillOpacity",
    "stop-color": "stopColor",
    "stop-opacity": "stopOpacity",
    "vector-effect": "vectorEffect",
    "gradient-units": "gradientUnits",
    "gradient-transform": "gradientTransform",
    "preserve-aspect-ratio": "preserveAspectRatio",
    "mask-units": "maskUnits",
    "mask-content-units": "maskContentUnits",
    "text-anchor": "textAnchor",
    "font-size": "fontSize",
    "font-family": "fontFamily",
    "font-style": "fontStyle",
    "font-weight": "fontWeight",
    "letter-spacing": "letterSpacing",
}

SVG_ALLOWED_ATTRIBUTES = {
    "id",
    "viewBox",
    "fill",
    "stroke",
    "strokeWidth",
    "strokeLinecap",
    "strokeLinejoin",
    "strokeMiterlimit",
    "strokeDasharray",
    "strokeDashoffset",
    "strokeOpacity",
    "fillOpacity",
    "fillRule",
    "clipRule",
    "clipPath",
    "vectorEffect",
    "d",
    "x",
    "y",
    "dx",
    "dy",
    "x1",
    "y1",
    "x2",
    "y2",
    "cx",
    "cy",
    "r",
    "rx",
    "ry",
    "points",
    "width",
    "height",
    "transform",
    "opacity",
    "offset",
    "stopColor",
    "stopOpacity",
    "gradientUnits",
    "gradientTransform",
    "preserveAspectRatio",
    "mask",
    "maskUnits",
    "maskContentUnits",
    "href",
    "textAnchor",
    "fontSize",
    "fontFamily",
    "fontStyle",
    "fontWeight",
    "letterSpacing",
    "overflow",
    "version",
}

SVG_DROP_ATTRIBUTES = {
    "class",
    "className",
    "style",
    "xmlns:xlink",
}

SVG_INTERNAL_HREF_ELEMENTS = {"use", "linearGradient", "radialGradient"}
SVG_TEXT_CONTENT_ELEMENTS = {"text", "title", "tspan"}


class RegistryDocsError(Exception):
    """Raised when the registry payload or generated output is unsafe or invalid."""


def _escape_html(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def _escape_text(text: str) -> str:
    return (
        _escape_html(text)
        .replace("{", "&#123;")
        .replace("}", "&#125;")
        .replace("`", "&#96;")
        .replace("\n", " ")
        .replace("\r", " ")
    )


def _normalize_text_newlines(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n")


def _read_utf8_text(path: Path) -> str:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return _normalize_text_newlines(handle.read())


def _validate_string(
    value: object,
    *,
    field_name: str,
    agent_id: str | None = None,
    max_length: int,
    allow_empty: bool = False,
) -> str:
    if not isinstance(value, str):
        prefix = f"agent {agent_id}: " if agent_id else ""
        raise RegistryDocsError(f"{prefix}{field_name} must be a string")

    normalized = value.strip()
    if not normalized and not allow_empty:
        prefix = f"agent {agent_id}: " if agent_id else ""
        raise RegistryDocsError(f"{prefix}{field_name} must not be empty")
    if len(normalized) > max_length:
        prefix = f"agent {agent_id}: " if agent_id else ""
        raise RegistryDocsError(
            f"{prefix}{field_name} exceeds {max_length} characters"
        )
    if CONTROL_CHAR_RE.search(normalized):
        prefix = f"agent {agent_id}: " if agent_id else ""
        raise RegistryDocsError(f"{prefix}{field_name} contains control characters")
    return normalized


def _validate_agent_id(value: object, *, index: int) -> str:
    agent_id = _validate_string(
        value,
        field_name="id",
        agent_id=f"index {index}",
        max_length=MAX_AGENT_ID_LENGTH,
    )
    if not SAFE_AGENT_ID_RE.fullmatch(agent_id):
        raise RegistryDocsError(
            f"agent {agent_id}: id must match {SAFE_AGENT_ID_RE.pattern}"
        )
    return agent_id


def _validate_https_url(value: object, *, field_name: str, agent_id: str) -> str:
    if value == "":
        return ""

    url = _validate_string(
        value,
        field_name=field_name,
        agent_id=agent_id,
        max_length=MAX_URL_LENGTH,
        allow_empty=True,
    )
    if not url:
        return ""

    parts = urlsplit(url)
    if parts.scheme != "https" or not parts.netloc:
        raise RegistryDocsError(
            f"agent {agent_id}: {field_name} must be an absolute https URL"
        )
    if parts.username or parts.password:
        raise RegistryDocsError(
            f"agent {agent_id}: {field_name} must not contain credentials"
        )
    return url


def _validate_registry_payload(payload: object) -> list[dict[str, str]]:
    if not isinstance(payload, dict):
        raise RegistryDocsError("registry payload must be a JSON object")

    raw_agents = payload.get("agents")
    if not isinstance(raw_agents, list):
        raise RegistryDocsError("registry payload field 'agents' must be a list")

    validated_agents: list[dict[str, str]] = []
    seen_ids: set[str] = set()
    for index, raw_agent in enumerate(raw_agents):
        if not isinstance(raw_agent, dict):
            raise RegistryDocsError(f"agent at index {index} must be an object")

        agent_id = _validate_agent_id(raw_agent.get("id"), index=index)
        if agent_id in seen_ids:
            raise RegistryDocsError(f"agent {agent_id}: duplicate id")
        seen_ids.add(agent_id)

        name_value = raw_agent["name"] if "name" in raw_agent else agent_id
        description_value = raw_agent["description"] if "description" in raw_agent else ""
        version_value = raw_agent["version"] if "version" in raw_agent else ""
        website_value = raw_agent["website"] if "website" in raw_agent else ""
        repository_value = raw_agent["repository"] if "repository" in raw_agent else ""

        validated_agents.append(
            {
                "id": agent_id,
                "name": _validate_string(
                    name_value,
                    field_name="name",
                    agent_id=agent_id,
                    max_length=MAX_NAME_LENGTH,
                ),
                "description": _validate_string(
                    description_value,
                    field_name="description",
                    agent_id=agent_id,
                    max_length=MAX_DESCRIPTION_LENGTH,
                    allow_empty=True,
                ),
                "version": _validate_string(
                    version_value,
                    field_name="version",
                    agent_id=agent_id,
                    max_length=MAX_VERSION_LENGTH,
                    allow_empty=True,
                ),
                "website": _validate_https_url(
                    website_value,
                    field_name="website",
                    agent_id=agent_id,
                ),
                "repository": _validate_https_url(
                    repository_value,
                    field_name="repository",
                    agent_id=agent_id,
                ),
            }
        )

    return validated_agents


def _local_name(name: str) -> str:
    if "}" in name:
        return name.split("}", 1)[1]
    return name


def _normalize_svg_attribute_name(name: str) -> str:
    local_name = _local_name(name)
    return SVG_ATTR_REPLACEMENTS.get(local_name, local_name)


def _is_safe_svg_attribute_value(attribute_name: str, value: str) -> bool:
    if len(value) > MAX_SVG_ATTR_LENGTH:
        return False
    if CONTROL_CHAR_RE.search(value):
        return False
    if "<" in value or ">" in value:
        return False

    lowered = value.strip().lower()
    if lowered.startswith("javascript:") or lowered.startswith("data:"):
        return False
    if "url(" in value and not INTERNAL_SVG_URL_RE.fullmatch(value.strip()):
        return False
    if attribute_name == "id":
        return bool(SAFE_SVG_ID_RE.fullmatch(value))
    return True


def _is_safe_internal_svg_href(value: str) -> bool:
    return bool(INTERNAL_SVG_HREF_RE.fullmatch(value.strip()))


def _validate_svg_text_content(text: str, *, context: str) -> str:
    if CONTROL_CHAR_RE.search(text):
        raise RegistryDocsError(f"icon SVG {context} contains control characters")
    return text


def _sanitize_svg_element(element: ET.Element, *, is_root: bool = False) -> ET.Element | None:
    tag_name = _local_name(element.tag)
    if tag_name not in SVG_ALLOWED_ELEMENTS:
        return None

    sanitized = ET.Element(tag_name)
    saw_safe_internal_href = False

    for raw_name, raw_value in element.attrib.items():
        local_name = _local_name(raw_name)
        if local_name.startswith("on") or local_name in SVG_DROP_ATTRIBUTES:
            continue
        normalized_name = _normalize_svg_attribute_name(local_name)
        if normalized_name == "href":
            if (
                tag_name in SVG_INTERNAL_HREF_ELEMENTS
                and _is_safe_internal_svg_href(raw_value)
            ):
                sanitized.set("href", raw_value.strip())
                saw_safe_internal_href = True
            continue
        if normalized_name not in SVG_ALLOWED_ATTRIBUTES:
            continue
        if not _is_safe_svg_attribute_value(normalized_name, raw_value):
            continue
        sanitized.set(normalized_name, raw_value)

    if tag_name == "use" and not saw_safe_internal_href:
        return None

    if is_root:
        sanitized.attrib.pop("width", None)
        sanitized.attrib.pop("height", None)
        sanitized.set("width", "20")
        sanitized.set("height", "20")
        sanitized.set("className", "agent-icon")
        sanitized.set("aria-hidden", "true")
        sanitized.set("focusable", "false")
        sanitized.set("xmlns", SVG_NAMESPACE)

    if element.text:
        if tag_name in SVG_TEXT_CONTENT_ELEMENTS:
            if element.text.strip():
                sanitized.text = _validate_svg_text_content(
                    element.text,
                    context=f"<{tag_name}> text",
                )
        elif element.text.strip():
            raise RegistryDocsError(
                f"icon SVG element <{tag_name}> contains unsupported text content"
            )

    for child in element:
        sanitized_child = _sanitize_svg_element(child)
        if child.tail:
            if tag_name in SVG_TEXT_CONTENT_ELEMENTS:
                if child.tail.strip():
                    validated_tail = _validate_svg_text_content(
                        child.tail,
                        context=f"<{tag_name}> tail text",
                    )
                else:
                    validated_tail = None
            elif child.tail.strip():
                raise RegistryDocsError(
                    f"icon SVG element <{tag_name}> contains unsupported text content"
                )
            else:
                validated_tail = None
        else:
            validated_tail = None

        if sanitized_child is not None:
            sanitized.append(sanitized_child)
            if validated_tail is not None:
                sanitized_child.tail = validated_tail
        elif validated_tail is not None and tag_name in SVG_TEXT_CONTENT_ELEMENTS:
            if len(sanitized) > 0:
                last_child = sanitized[-1]
                last_child.tail = (last_child.tail or "") + validated_tail
            else:
                sanitized.text = (sanitized.text or "") + validated_tail

    return sanitized


def _sanitize_svg(svg: str) -> str:
    """Sanitize SVG for JSX embedding with a strict static-vector allowlist."""
    if len(svg.encode("utf-8")) > MAX_SVG_BYTES:
        raise RegistryDocsError(f"icon SVG exceeds {MAX_SVG_BYTES} bytes")

    stripped = svg.strip()
    upper = stripped.upper()
    if "<!DOCTYPE" in upper or "<!ENTITY" in upper:
        raise RegistryDocsError("icon SVG must not contain DOCTYPE or ENTITY declarations")

    try:
        root = ET.fromstring(stripped)
    except ET.ParseError as exc:
        raise RegistryDocsError(f"icon SVG is not well-formed XML: {exc}") from exc

    if _local_name(root.tag) != "svg":
        raise RegistryDocsError("icon root element must be <svg>")

    sanitized_root = _sanitize_svg_element(root, is_root=True)
    if sanitized_root is None:
        raise RegistryDocsError("icon SVG did not contain a valid <svg> root")

    serialized = ET.tostring(sanitized_root, encoding="unicode", short_empty_elements=True)
    return _escape_svg_text_nodes_for_jsx(serialized)


def _escape_svg_text_nodes_for_jsx(serialized_svg: str) -> str:
    """Escape braces in text nodes so MDX does not treat them as JSX expressions."""

    def replace_text(match: re.Match[str]) -> str:
        text = match.group(1)
        if not text:
            return match.group(0)
        return f">{text.replace('{', '&#123;').replace('}', '&#125;')}<"

    return re.sub(r">([^<]*)<", replace_text, serialized_svg)


def _make_request(url: str, timeout: int = 30) -> bytes:
    """Make a request with proper headers."""
    req = urllib.request.Request(url, headers={"User-Agent": "ACP-Registry-Docs/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def _fetch_registry(registry_url: str) -> list[dict[str, str]]:
    """Fetch, decode, and validate registry.json."""
    print(f"Fetching registry from {registry_url}...")
    try:
        raw_bytes = _make_request(registry_url)
        payload = json.loads(raw_bytes.decode("utf-8"))
    except UnicodeDecodeError as exc:
        raise RegistryDocsError(f"registry payload is not valid UTF-8: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise RegistryDocsError(f"registry payload is not valid JSON: {exc}") from exc
    except Exception as exc:
        raise RegistryDocsError(f"could not fetch registry payload: {exc}") from exc

    agents = _validate_registry_payload(payload)
    print(f"Fetched {len(agents)} agents")
    return agents


def _fetch_icon_svg(agent_id: str, *, icon_base_url: str, retries: int = 3) -> str | None:
    """Fetch and sanitize an SVG icon.

    Returns the sanitized SVG string, or None if all retries fail.
    """
    url = f"{icon_base_url.rstrip('/')}/{agent_id}.svg"
    for attempt in range(1, retries + 1):
        try:
            svg = _make_request(url, timeout=10).decode("utf-8")
            return _sanitize_svg(svg)
        except Exception as exc:
            print(
                f"Warning: Could not fetch icon for {agent_id} "
                f"(attempt {attempt}/{retries}): {exc}"
            )
            if attempt < retries:
                time.sleep(2)
    return None


def _fetch_all_icons(agents: list[dict[str, str]], *, icon_base_url: str) -> dict[str, str]:
    """Fetch icons for all agents.

    Returns a dict mapping agent_id -> sanitized SVG string.
    Raises RegistryDocsError if any icon fails to fetch after retries.
    """
    icons: dict[str, str] = {}
    failed: list[str] = []

    for agent in agents:
        agent_id = agent["id"]
        svg = _fetch_icon_svg(agent_id, icon_base_url=icon_base_url)
        if svg is None:
            failed.append(agent_id)
        else:
            icons[agent_id] = svg

    if failed:
        failed_list = ", ".join(failed)
        raise RegistryDocsError(
            f"failed to fetch or sanitize icons for {len(failed)} agent(s): {failed_list}"
        )

    return icons


def _render_agent_cards(agents: list[dict[str, str]], icons: dict[str, str]) -> str:
    """Render agent cards as MDX components."""
    sorted_agents = sorted(agents, key=lambda agent: agent["name"].lower())
    lines: list[str] = ["<CardGroup cols={2}>"]

    for agent in sorted_agents:
        agent_id = agent["id"]
        name = agent["name"]
        description = _escape_text(agent["description"])
        version = _escape_text(agent["version"])
        website = agent["website"]
        repository = agent["repository"]
        href = website or repository
        icon_svg = icons.get(agent_id)
        version_text = version or "version unknown"

        lines.append("  <Card")
        lines.append(f'    title="{_escape_html(name)}"')
        if href:
            lines.append(f'    href="{_escape_html(href)}"')
        if icon_svg:
            lines.append("    icon={")
            for line in icon_svg.splitlines():
                lines.append(f"      {line}")
            lines.append("    }")
        lines.append("  >")
        if description:
            lines.append(f"    {description}")
            lines.append("")
        if repository:
            lines.append(
                f'    **{version_text}**, '
                f'<a href="{_escape_html(repository)}"><Icon icon="github" /></a>'
            )
        else:
            lines.append(f"    **{version_text}**")
        lines.append("")
        lines.append("  </Card>")

    lines.append("</CardGroup>")
    return "\n".join(lines)


def _validate_placeholder_count(template: str) -> None:
    placeholder_count = template.count(PLACEHOLDER)
    if placeholder_count != 1:
        raise RegistryDocsError(
            f"template must contain {PLACEHOLDER!r} exactly once; found {placeholder_count}"
        )


def _render_output(template: str, cards: str) -> str:
    _validate_placeholder_count(template)
    return template.replace(PLACEHOLDER, cards)


def _write_atomic(path: Path, content: str) -> None:
    temp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            "w",
            encoding="utf-8",
            newline="\n",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as handle:
            temp_path = Path(handle.name)
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, path)
    except Exception:
        if temp_path is not None:
            try:
                temp_path.unlink(missing_ok=True)
            except OSError:
                pass
        raise


def generate_registry_docs(
    *,
    registry_url: str,
    icon_base_url: str,
    template_path: Path,
    output_path: Path,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if not template_path.exists():
        raise RegistryDocsError(f"template file not found at {template_path}")

    template = _read_utf8_text(template_path)
    _validate_placeholder_count(template)

    agents = _fetch_registry(registry_url)
    if not agents:
        print("Warning: No agents found in registry")

    icons = _fetch_all_icons(agents, icon_base_url=icon_base_url)
    cards = _render_agent_cards(agents, icons)
    output = _render_output(template, cards)
    _write_atomic(output_path, output)
    print(f"Generated {output_path}")


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Fetch ACP registry metadata, sanitize registry icons, and render "
            "the registry documentation page from a template."
        )
    )
    parser.add_argument(
        "--registry-url",
        default=os.environ.get("REGISTRY_URL", DEFAULT_REGISTRY_URL),
        help="Registry JSON URL. Defaults to REGISTRY_URL or the live CDN URL.",
    )
    parser.add_argument(
        "--icon-base-url",
        default=os.environ.get("ICON_BASE_URL", DEFAULT_ICON_BASE_URL),
        help="Base URL or directory URI for icon SVG files. Defaults to ICON_BASE_URL.",
    )
    parser.add_argument(
        "--template-path",
        type=Path,
        default=Path(os.environ.get("REGISTRY_TEMPLATE_PATH", str(DEFAULT_TEMPLATE_PATH))),
        help=(
            "Path to the MDX template file. Defaults to REGISTRY_TEMPLATE_PATH or "
            "docs/get-started/_registry_agents.mdx."
        ),
    )
    parser.add_argument(
        "--output-path",
        type=Path,
        default=Path(os.environ.get("REGISTRY_OUTPUT_PATH", str(DEFAULT_OUTPUT_PATH))),
        help=(
            "Path to write the rendered MDX file. Defaults to REGISTRY_OUTPUT_PATH or "
            "docs/get-started/registry.mdx."
        ),
    )
    return parser


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    return _build_arg_parser().parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = _parse_args(argv)

    try:
        generate_registry_docs(
            registry_url=args.registry_url,
            icon_base_url=args.icon_base_url,
            template_path=args.template_path,
            output_path=args.output_path,
        )
    except RegistryDocsError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
