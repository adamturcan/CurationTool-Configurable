#!/usr/bin/env bash
# Regenerates the landing-site content pages from the markdown sources
# in architecture/ and thesis_additions/. Run from the repo root or from
# inside the landing/ directory.
#
# Requires: pandoc (>= 3.0). Install via `brew install pandoc`.
#
# Output: HTML pages and copied images under landing/, plus PDF/source
# artefacts mirrored into landing/downloads/.

set -euo pipefail

# Resolve repo root regardless of where the script is invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LANDING="${SCRIPT_DIR}"

if ! command -v pandoc >/dev/null 2>&1; then
  echo "error: pandoc not found on PATH. Install with: brew install pandoc" >&2
  exit 1
fi

# Common pandoc options. Each rendered page links to ../style.css so all
# pages share the same look as the landing index.
PANDOC_OPTS=(
  # gfm with two extensions:
  #   yaml_metadata_block: consume the leading `---` YAML so it is treated
  #     as metadata instead of being rendered into the body.
  #   attributes: parse pandoc-style image attributes like `{width=85%}` so
  #     they apply to <img> instead of leaking as text.
  --from=gfm+yaml_metadata_block+attributes
  --to=html5
  --standalone
  --metadata=lang:en
)

render() {
  # render <source.md> <output_dir> <title> <css_relative_path> <back_relative_path>
  local src="$1"
  local dst_dir="$2"
  local title="$3"
  local css_rel="$4"
  local back_rel="$5"

  mkdir -p "$dst_dir"
  local include="${dst_dir}/_back.html"
  sed "s|__BACK__|${back_rel}|g" "${LANDING}/_back-link.html" > "$include"

  # Set <title> via pagetitle and clear the YAML `title` metadata so pandoc does not also emit an <h1 class="title"> (the markdown's own first heading is the only h1 we want).
  # Strip LaTeX-only YAML directives that pandoc would otherwise inject verbatim into the HTML <head> (header-includes, geometry, fontsize, documentclass: meaningful for the PDF render, noise for HTML).
  pandoc "${PANDOC_OPTS[@]}" \
    --metadata=pagetitle:"$title" \
    --metadata=title:"" \
    --metadata=header-includes:"" \
    --metadata=geometry:"" \
    --metadata=fontsize:"" \
    --metadata=documentclass:"" \
    --css="$css_rel" \
    --include-before-body="$include" \
    "$src" -o "$dst_dir/index.html"

  rm -f "$include"
  echo "rendered $src -> $dst_dir/index.html"
}

# rsync-style copy without editor backups or macOS junk
copy_clean() {
  local src="$1"
  local dst="$2"
  rsync -a --exclude='*~' --exclude='.DS_Store' --exclude='*-old.*' \
    "$src" "$dst" 2>/dev/null || cp -R "$src" "$dst"
}

# Content pages.

render \
  "${REPO_ROOT}/thesis_additions/testing/testing_results.md" \
  "${LANDING}/testing/results" \
  "Stakeholder testing: aggregate results" \
  "../../style.css" \
  "../../"

render \
  "${REPO_ROOT}/thesis_additions/guide/user_guide.md" \
  "${LANDING}/user-guide" \
  "User guide" \
  "../style.css" \
  "../"

render \
  "${REPO_ROOT}/architecture/use-case/use_cases.md" \
  "${LANDING}/use-cases" \
  "Use-case specifications" \
  "../style.css" \
  "../"

render \
  "${REPO_ROOT}/thesis_additions/configurability_testing/mock_gallery.md" \
  "${LANDING}/configurability" \
  "Mock-adapter gallery" \
  "../style.css" \
  "../"

# Image directories alongside the rendered pages.

# Both source markdown files reference their images as `images/<file>.png`,
# matching the actual on-disk layout (thesis_additions/<doc>/images/).
# Mirror that layout under each rendered page.
mkdir -p "${LANDING}/user-guide/images"
copy_clean "${REPO_ROOT}/thesis_additions/guide/images/" "${LANDING}/user-guide/images/"

if [ -d "${REPO_ROOT}/thesis_additions/configurability_testing/images" ]; then
  mkdir -p "${LANDING}/configurability/images"
  copy_clean "${REPO_ROOT}/thesis_additions/configurability_testing/images/" "${LANDING}/configurability/images/"
fi

# Architecture overview page.

mkdir -p "${LANDING}/architecture/images"
cp "${REPO_ROOT}/architecture/c4/finalSystemLandscape.png"   "${LANDING}/architecture/images/c4-landscape.png"
cp "${REPO_ROOT}/architecture/c4/finalSystemContainers.png"  "${LANDING}/architecture/images/c4-containers.png"
cp "${REPO_ROOT}/architecture/c4/finalClientArchitecture.png"  "${LANDING}/architecture/images/c4-client.png"
cp "${REPO_ROOT}/architecture/c4/finalBackendArchitecture.png" "${LANDING}/architecture/images/c4-backend.png"
cp "${REPO_ROOT}/architecture/domain/domain_model.png"        "${LANDING}/architecture/images/domain-model.png"
cp "${REPO_ROOT}/architecture/use-case/diagrams/use_case.png" "${LANDING}/architecture/images/use-case-diagram.png"
cp "${REPO_ROOT}/architecture/use-case/diagrams/activity_editing.png" "${LANDING}/architecture/images/activity-editing.png"
cp "${REPO_ROOT}/architecture/use-case/diagrams/activity_nlp.png"     "${LANDING}/architecture/images/activity-nlp.png"
cp "${REPO_ROOT}/architecture/wireframes/wf_main.png"        "${LANDING}/architecture/images/wf-main.png"
cp "${REPO_ROOT}/architecture/wireframes/wf_workspaces.png"  "${LANDING}/architecture/images/wf-workspaces.png"
cp "${REPO_ROOT}/architecture/wireframes/wf-segment.png"     "${LANDING}/architecture/images/wf-segment.png"
cp "${REPO_ROOT}/architecture/wireframes/wf_conflict.png"    "${LANDING}/architecture/images/wf-conflict.png"
cp "${REPO_ROOT}/architecture/wireframes/wf_admin.png"       "${LANDING}/architecture/images/wf-admin.png"

echo "copied architecture images -> ${LANDING}/architecture/images/"

# Downloads: PDF mirrors and source artefacts.

mkdir -p "${LANDING}/downloads"
cp "${REPO_ROOT}/architecture/use-case/use_cases.pdf"               "${LANDING}/downloads/use_cases.pdf"
cp "${REPO_ROOT}/thesis_additions/guide/user_guide.pdf"             "${LANDING}/downloads/user_guide.pdf"
cp "${REPO_ROOT}/thesis_additions/testing/testing_results.pdf"      "${LANDING}/downloads/testing_results.pdf"
cp "${REPO_ROOT}/thesis_additions/configurability_testing/mock_gallery.pdf" "${LANDING}/downloads/mock_gallery.pdf"
cp "${REPO_ROOT}/architecture/c4/c4.dsl"                            "${LANDING}/downloads/c4.dsl"
cp "${REPO_ROOT}/architecture/domain/domain.uml"                    "${LANDING}/downloads/domain.uml"
cp "${REPO_ROOT}/architecture/use-case/diagrams/use-case.uml"       "${LANDING}/downloads/use-case.uml"
cp "${REPO_ROOT}/architecture/use-case/diagrams/activity-edit.uml"  "${LANDING}/downloads/activity-edit.uml"
cp "${REPO_ROOT}/architecture/use-case/diagrams/activity_nlp.uml"   "${LANDING}/downloads/activity_nlp.uml"

echo "copied artefacts -> ${LANDING}/downloads/"
echo "done."
