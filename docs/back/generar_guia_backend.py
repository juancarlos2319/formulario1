"""Exporta documentacion e indexa fuentes sin reproducir secretos."""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import subprocess
import textwrap
from datetime import date
from html import escape
from pathlib import Path
from pypdf import PdfReader
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, Preformatted, SimpleDocTemplate, Spacer

REPO = Path(__file__).resolve().parents[2]
BACKEND = REPO / "Backend" / "demo"
OUTPUT = REPO / "docs" / "back"
PDF = OUTPUT / "Guia_backend_archivos_y_lineas.pdf"
MANIFEST = OUTPUT / "referencias_backend.json"
DOCUMENTS = [
    REPO / "README.md", *sorted((REPO / "docs").glob("*.md")),
    REPO / "Frontend/README.md", BACKEND / "README.md",
    REPO / "docs/front/FRONTEND_ESPECIFICACION_AGENTES.md",
    REPO / "docs/back/BACKEND_ESPECIFICACION_AGENTES.md",
]


def source_paths() -> list[Path]:
    """Enumera fuentes/configuracion; excluye outputs, dependencias y metadatos."""
    sources = set()
    for folder in ("src", "scripts", ".mvn"):
        sources.update(p for p in (BACKEND / folder).rglob("*") if p.is_file())
    for name in ("pom.xml", "mvnw", "mvnw.cmd", ".gitignore", ".gitattributes", "AGENTS.md"):
        path = BACKEND / name
        if path.is_file():
            sources.add(path)
    sources.add(Path(__file__).resolve())
    sources.update(DOCUMENTS)
    return sorted(sources, key=lambda p: p.relative_to(REPO).as_posix())


def declarations(path: Path, lines: list[str]) -> list[dict]:
    """Calcula nombres/lineas; nunca almacena cuerpos de codigo ni propiedades."""
    patterns = []
    if path.suffix == ".java":
        patterns = [
            ("tipo", r"^\s*(?:(?:public|private|protected|static|final|abstract)\s+)*(?:class|record|interface|enum)\s+(\w+)"),
            ("metodo", r"^\s*(?:public|private|protected)\s+(?:static\s+)?(?:final\s+)?(?:[\w.<>,?\[\]]+\s+)+(\w+)\s*\("),
        ]
    elif path.name == "schema.sql":
        patterns = [("tabla", r"^CREATE TABLE IF NOT EXISTS\s+(\w+)")]
    elif path.suffix == ".md":
        patterns = [("seccion", r"^#{1,4}\s+(.+)")]
    elif path.suffix == ".py":
        patterns = [("funcion", r"^def\s+(\w+)\s*\(")]
    return [{"line": number, "kind": kind, "name": match.group(1)}
            for number, line in enumerate(lines, 1)
            for kind, pattern in patterns if (match := re.search(pattern, line))]


def inventory() -> list[dict]:
    """Calcula hashes y referencias sin copiar registros ni secretos."""
    result = []
    for path in source_paths():
        raw = path.read_bytes()
        lines = raw.decode("utf-8-sig").splitlines()
        result.append({"path": path.relative_to(REPO).as_posix(),
                       "sha256": hashlib.sha256(raw).hexdigest(), "lines": len(lines),
                       "references": declarations(path, lines), "content_included": False})
    return result


def plain(text: str) -> str:
    """Adapta Markdown a texto sin interpretar HTML de las fuentes."""
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", text)
    return text.replace("**", "").replace(chr(96), "").replace("\u2192", " -> ")


def styles() -> dict[str, ParagraphStyle]:
    """Selecciona fuentes del sistema con fallback portable."""
    body, bold, mono = "Helvetica", "Helvetica-Bold", "Courier"
    folder = Path("C:/Windows/Fonts")
    if all((folder / name).is_file() for name in ("arial.ttf", "arialbd.ttf", "consola.ttf")):
        for name, file in (("DocBody", "arial.ttf"), ("DocBold", "arialbd.ttf"), ("DocCode", "consola.ttf")):
            pdfmetrics.registerFont(TTFont(name, str(folder / file)))
        body, bold, mono = "DocBody", "DocBold", "DocCode"
    return {
        "body": ParagraphStyle("body", fontName=body, fontSize=9, leading=13, spaceAfter=6, wordWrap="CJK"),
        "h1": ParagraphStyle("h1", fontName=bold, fontSize=17, leading=22, spaceAfter=12, keepWithNext=True),
        "h2": ParagraphStyle("h2", fontName=bold, fontSize=12, leading=16, spaceBefore=10, spaceAfter=7, keepWithNext=True),
        "h3": ParagraphStyle("h3", fontName=bold, fontSize=10, leading=14, spaceBefore=8, spaceAfter=6, keepWithNext=True),
        "code": ParagraphStyle("code", fontName=mono, fontSize=7, leading=10, spaceAfter=5),
    }


def append_markdown(story: list, path: Path, style: dict) -> None:
    """Exporta encabezados/parrafos/tablas; Mermaid queda como notacion textual."""
    code = False
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if line.startswith(chr(96) * 3):
            code = not code
            story.append(Spacer(1, 5))
            continue
        if not line.strip():
            continue
        if code or line.startswith("|"):
            for wrapped in textwrap.wrap(plain(line), width=108, replace_whitespace=False) or [""]:
                story.append(Preformatted(wrapped, style["code"]))
        else:
            heading = re.match(r"^(#{1,4})\s+(.*)", line)
            key = "h" + str(min(len(heading.group(1)), 3)) if heading else "body"
            story.append(Paragraph(escape(plain(heading.group(2) if heading else line)), style[key]))


def page_footer(canvas, doc) -> None:
    """Numera las paginas del PDF."""
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.drawRightString(A4[0] - 42, 24, str(doc.page))
    canvas.restoreState()


def generate_pdf(review_date: str, entries: list[dict]) -> int:
    """Exporta documentos e indice; no reproduce cuerpos de fuentes o semilla."""
    style = styles()
    story = [
        Paragraph("Guia tecnica del proyecto e indice del backend", style["h1"]),
        Paragraph("Revision documental: " + escape(review_date), style["body"]),
        Paragraph("Fuente editable: Markdown del repositorio. El indice contiene rutas, hashes, "
                  "declaraciones y lineas, no cuerpos de fuentes ni credenciales. "
                  "Este generador no ejecuta pruebas.", style["body"]), PageBreak(),
    ]
    for path in DOCUMENTS:
        story.append(Paragraph(escape(path.relative_to(REPO).as_posix()), style["h2"]))
        append_markdown(story, path, style)
        story.append(PageBreak())
    story.append(Paragraph("Indice de archivos y declaraciones", style["h1"]))
    for item in entries:
        story.append(Paragraph(escape(item["path"]), style["h3"]))
        story.append(Paragraph(f'{item["lines"]} lineas; SHA-256: {item["sha256"]}', style["body"]))
        for ref in item["references"]:
            story.append(Paragraph(escape(f'L{ref["line"]}: {ref["kind"]} {ref["name"]}'), style["body"]))
    doc = SimpleDocTemplate(str(PDF), pagesize=A4, leftMargin=42, rightMargin=42,
                            topMargin=42, bottomMargin=42, title="Guia tecnica del proyecto",
                            author="Documentacion del proyecto")
    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    reader = PdfReader(PDF)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    for marker in ("direccion_titular", "PersonaDetalleDTO", "Indice de archivos"):
        if marker not in text:
            raise RuntimeError("Contenido ausente en PDF: " + marker)
    return len(reader.pages)


def main() -> None:
    """Genera entregables o comprueba hashes y referencias sin reescribirlos."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", required=True, help="Fecha de revision YYYY-MM-DD")
    parser.add_argument("--check", action="store_true", help="Verifica fuentes y PDF sin reescribir")
    args = parser.parse_args()
    review_date = date.fromisoformat(args.date).isoformat()
    entries = inventory()
    if args.check:
        stored = json.loads(MANIFEST.read_text(encoding="utf-8"))
        if stored["review_date"] != review_date or stored["sources"] != entries:
            raise SystemExit("Manifiesto desactualizado; regenerar la guia.")
        if hashlib.sha256(PDF.read_bytes()).hexdigest() != stored["pdf"]["sha256"]:
            raise SystemExit("El PDF no coincide con el manifiesto.")
        print(json.dumps({"verified": True, "files": len(entries), "pages": stored["pdf"]["pages"]}))
        return
    pages = generate_pdf(review_date, entries)
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=REPO, text=True).strip()
    manifest = {
        "schema_version": 2, "review_date": review_date, "base_commit": commit,
        "note": "Puede incluir cambios locales documentales; hashes identifican las fuentes exactas.",
        "sources": entries,
        "pdf": {"path": PDF.relative_to(REPO).as_posix(), "pages": pages,
                "sha256": hashlib.sha256(PDF.read_bytes()).hexdigest()},
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"generated": True, "files": len(entries), "pages": pages}))


if __name__ == "__main__":
    main()
