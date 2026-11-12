# Publishing the packages

Three language wrappers live in `packages/`. Each one is a thin launcher:
it fetches `release.json` from the latest GitHub release, downloads
`GlassTicker.exe`, and verifies it against the SHA-256 published there.

The npm and PyPI wrappers are already built and tested locally. The Maven
module compiles and runs. Publishing needs your own accounts for the
registries - the commands below are exact.

## Before you start

Bump the version in all three places so they stay in step:

| File | Field |
| --- | --- |
| `packages/npm/glass-ticker/package.json` | `version` |
| `packages/python/pyproject.toml` | `project.version` |
| `packages/java/pom.xml` → `pom.xml` | `<version>` |
| `src/main/java/com/github/shounakjoshi88/glassticker/Launcher.java` | `VERSION` |
| `packages/python/src/glass_ticker/__init__.py` | `__version__` |

## npm

```bash
cd packages/npm/glass-ticker
npm login                 # https://www.npmjs.com/login
npm pack --dry-run        # check the file list
npm publish               # add --otp <code> if 2FA is on
```

Test the published package before telling anyone about it:

```bash
npm install -g glass-ticker
glassticker path
```

## PyPI

```bash
python -m pip install --upgrade build twine
cd packages/python
python -m build             # writes dist/*.whl and dist/*.tar.gz
twine check dist/*
twine upload dist/*         # add --repository testpypi first if you want a dry run
```

Test it:

```bash
pip install glass-ticker
glass-ticker path
```

Build a source distribution and a wheel - the wheel is pure Python, the
executable itself is downloaded on first run.

## Maven Central

```bash
cd .
mvn package                 # builds target/glass-ticker-launcher-2.3.0.jar
mvn -Prelease deploy        # publishes to Central
```

`mvn -Prelease deploy` needs a [Sonatype Central Portal](https://central.sonatype.com/)
account. Put the token in `~/.m2/settings.xml`:

```xml
<settings>
  <servers>
    <server>
      <id>central</id>
      <username>__token__</username>
      <password>YOUR_CENTRAL_TOKEN</password>
    </server>
  </servers>
</settings>
```

## Windows package managers

**Scoop** - the bucket is its own repo, `shounakjoshi88-a11y/scoop-bucket`.
The manifest source is `packaging/scoop/bucket/glass-ticker.json`; copy it
into the bucket repo and push:

```bash
cd packaging/scoop
git add bucket/glass-ticker.json
git commit -m "chore: update glass-ticker to 2.0.2"
git push
```

**winget** - the manifest lives in `packaging/winget/manifests/`. Validate it
before submitting:

```powershell
winget validate --manifest .\packaging\winget\manifests\s\ShounakJoshi\GlassTicker\2.0.1
```

Then open a pull request against `microsoft/winget-pkgs` with the title
`New package: ShounakJoshi.GlassTicker version X.Y.Z`.

## GitHub Packages (automatic)

.github/workflows/publish-packages.yml runs on every * tag and publishes
the npm and Maven wrappers to this repository's GitHub Packages registry with
the built-in GITHUB_TOKEN, then flips both to public. Nothing to configure -
the packages show up under the repository's *Packages* tab.

## After every release

1. Tag the release - the tag triggers the Windows build:
   ```bash
   git tag -a v2.0.2 -m "Glass Ticker 2.0.2"
   git push origin v2.0.2
   ```
2. The build attaches `GlassTicker.exe`, `release.json` and
   `GlassTicker.exe.sha256` to the release.
3. Update the scoop manifest hash and the winget manifest URL + SHA-256 to
   the new version.
4. Publish the npm, PyPI and Maven packages with the matching version.
