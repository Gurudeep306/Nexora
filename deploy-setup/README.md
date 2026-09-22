# Move these 3 files into place (one command)

Claude isn't allowed to write into `.github/` or `.devcontainer/` on your Mac,
so they're parked here. From the nexora folder, run:

    mkdir -p .github/workflows .devcontainer && mv deploy-setup/ci.yml deploy-setup/backup.yml .github/workflows/ && mv deploy-setup/devcontainer.json .devcontainer/ && rm -r deploy-setup

- ci.yml          → tests + build on every push (Render deploys only if it passes)
- backup.yml      → nightly database backup
- devcontainer.json → one-click GitHub Codespaces setup
