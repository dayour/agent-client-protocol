from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import generate_registry_docs as registry_docs


class _PartialWriteThenFail:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._handle = path.open("w", encoding="utf-8", newline="\n")
        self.name = str(path)

    def __enter__(self) -> _PartialWriteThenFail:
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> bool:
        self._handle.close()
        return False

    def write(self, content: str) -> int:
        partial = content[:8]
        self._handle.write(partial)
        self._handle.flush()
        raise UnicodeEncodeError("cp1252", "Δ", 0, 1, "ordinal not in range")

    def flush(self) -> None:
        self._handle.flush()

    def fileno(self) -> int:
        return self._handle.fileno()


def _read_text(path: Path) -> str:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return handle.read()


class GenerateRegistryDocsTests(unittest.TestCase):
    def test_sanitize_svg_strips_active_content(self) -> None:
        svg = """
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
          <script>alert(1)</script>
          <foreignObject><div>bad</div></foreignObject>
          <rect width="16" height="16" fill="currentColor" onload="alert(1)" />
          <use href="https://evil.example/icon.svg#part" />
        </svg>
        """

        sanitized = registry_docs._sanitize_svg(svg)

        self.assertIn('className="agent-icon"', sanitized)
        self.assertIn("<rect", sanitized)
        self.assertNotIn("<script", sanitized)
        self.assertNotIn("foreignObject", sanitized)
        self.assertNotIn("onload=", sanitized)
        self.assertNotIn("<use", sanitized)
        self.assertNotIn("https://evil.example", sanitized)

    def test_validate_registry_rejects_javascript_urls(self) -> None:
        payload = {
            "agents": [
                {
                    "id": "bad-agent",
                    "name": "Bad Agent",
                    "description": "Unsafe website",
                    "version": "1.0.0",
                    "website": "javascript:alert(1)",
                }
            ]
        }

        with self.assertRaisesRegex(
            registry_docs.RegistryDocsError, "website must be an absolute https URL"
        ):
            registry_docs._validate_registry_payload(payload)

    def test_validate_registry_rejects_javascript_repository_urls(self) -> None:
        payload = {
            "agents": [
                {
                    "id": "bad-repo",
                    "name": "Bad Repo",
                    "description": "Unsafe repository",
                    "version": "1.0.0",
                    "repository": "data:text/html;base64,QQ==",
                }
            ]
        }

        with self.assertRaisesRegex(
            registry_docs.RegistryDocsError, "repository must be an absolute https URL"
        ):
            registry_docs._validate_registry_payload(payload)

    def test_validate_registry_rejects_malformed_and_oversized_entries(self) -> None:
        with self.assertRaisesRegex(
            registry_docs.RegistryDocsError, "agent at index 0 must be an object"
        ):
            registry_docs._validate_registry_payload({"agents": ["not-an-object"]})

        oversized_name = "A" * (registry_docs.MAX_NAME_LENGTH + 1)
        with self.assertRaisesRegex(
            registry_docs.RegistryDocsError,
            f"name exceeds {registry_docs.MAX_NAME_LENGTH} characters",
        ):
            registry_docs._validate_registry_payload(
                {
                    "agents": [
                        {
                            "id": "oversized-agent",
                            "name": oversized_name,
                            "description": "desc",
                            "version": "1.0.0",
                        }
                    ]
                }
            )

        with self.assertRaisesRegex(
            registry_docs.RegistryDocsError, "description contains control characters"
        ):
            registry_docs._validate_registry_payload(
                {
                    "agents": [
                        {
                            "id": "control-char-agent",
                            "name": "Control Char Agent",
                            "description": "bad\x01description",
                            "version": "1.0.0",
                        }
                    ]
                }
            )

    def test_validate_placeholder_count_rejects_missing_placeholder(self) -> None:
        with self.assertRaisesRegex(
            registry_docs.RegistryDocsError, "exactly once; found 0"
        ):
            registry_docs._validate_placeholder_count("no placeholder here")

    def test_validate_placeholder_count_rejects_multiple_placeholders(self) -> None:
        template = f"{registry_docs.PLACEHOLDER}\n{registry_docs.PLACEHOLDER}"
        with self.assertRaisesRegex(
            registry_docs.RegistryDocsError, "exactly once; found 2"
        ):
            registry_docs._validate_placeholder_count(template)

    def test_validate_placeholder_count_accepts_single_placeholder(self) -> None:
        template = f"before\n{registry_docs.PLACEHOLDER}\nafter\n"
        rendered = registry_docs._render_output(template, "<CardGroup />")
        self.assertEqual(rendered, "before\n<CardGroup />\nafter\n")

    def test_atomic_write_keeps_destination_intact_on_failure(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir)
            output_path = temp_root / "registry.mdx"
            output_path.write_text("stable content\n", encoding="utf-8", newline="\n")
            failing_temp_path = temp_root / ".registry.mdx.partial.tmp"

            def _named_temp_file(*args, **kwargs):
                return _PartialWriteThenFail(failing_temp_path)

            with mock.patch.object(
                registry_docs.tempfile, "NamedTemporaryFile", side_effect=_named_temp_file
            ):
                with self.assertRaises(UnicodeEncodeError):
                    registry_docs._write_atomic(output_path, "new Δ content that fails")

            self.assertEqual(_read_text(output_path), "stable content\n")
            self.assertFalse(failing_temp_path.exists())

    def test_non_ascii_round_trip_uses_utf8(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "registry.mdx"
            content = "Greek delta: Δ\n"

            registry_docs._write_atomic(output_path, content)

            self.assertEqual(_read_text(output_path), content)
            self.assertIn(b"\xce\x94", output_path.read_bytes())

    def test_generate_registry_docs_from_local_fixture(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = Path(temp_dir)
            template_path = temp_root / "_registry_agents.mdx"
            output_path = temp_root / "registry.mdx"
            registry_path = temp_root / "registry.json"
            icon_path = temp_root / "local-agent.svg"

            template_path.write_text(
                "---\n## Agents\n\n$$AGENTS_CARDS$$\n",
                encoding="utf-8",
                newline="\n",
            )
            registry_path.write_text(
                """
                {
                  "agents": [
                    {
                      "id": "local-agent",
                      "name": "Local Agent",
                      "description": "Handles Δ safely",
                      "version": "1.2.3",
                      "website": "https://example.com/agent",
                      "repository": "https://github.com/example/local-agent"
                    }
                  ]
                }
                """.strip(),
                encoding="utf-8",
                newline="\n",
            )
            icon_path.write_text(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">'
                '<path d="M1 1H15V15H1Z" fill="currentColor"/></svg>',
                encoding="utf-8",
                newline="\n",
            )

            registry_docs.generate_registry_docs(
                registry_url=registry_path.as_uri(),
                icon_base_url=temp_root.as_uri(),
                template_path=template_path,
                output_path=output_path,
            )

            output = _read_text(output_path)
            self.assertIn("Local Agent", output)
            self.assertIn("Handles Δ safely", output)
            self.assertIn("https://example.com/agent", output)
            self.assertIn("https://github.com/example/local-agent", output)
            self.assertGreater(output_path.stat().st_size, 0)


if __name__ == "__main__":
    unittest.main()
