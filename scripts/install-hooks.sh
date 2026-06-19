#!/usr/bin/env sh
#
# Opt-in installer for the openclearance.org deploy hook.
#
# Run this ONCE on the machine that deploys openclearance.org (the operator's
# machine, which already has wrangler installed and authenticated via
# `wrangler login`). It symlinks `.git/hooks/post-merge` to the committed
# `scripts/hooks/post-merge`, so that a `git pull` on `main` after a PR merge
# auto-deploys with the operator's own local wrangler auth.
#
# Contributors who only build and test do NOT need to run this. No credentials
# are involved: the Cloudflare token never lives in this repo.
#
# Idempotent and safe to re-run.
#
set -eu

repo_root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "install-hooks: not inside a git working tree, skipping."
  exit 0
}

hooks_dir="$repo_root/.git/hooks"
if [ ! -d "$hooks_dir" ]; then
  echo "install-hooks: no .git/hooks directory at $hooks_dir, skipping."
  exit 0
fi

src="$repo_root/scripts/hooks/post-merge"
if [ ! -f "$src" ]; then
  echo "install-hooks: $src not found, nothing to install."
  exit 1
fi

chmod +x "$src"
# Relative link: .git/hooks/ is two levels below the repo root.
ln -sf "../../scripts/hooks/post-merge" "$hooks_dir/post-merge"
echo "install-hooks: linked .git/hooks/post-merge -> scripts/hooks/post-merge"
echo "install-hooks: a git pull on main with site changes will now deploy via your local wrangler auth."
