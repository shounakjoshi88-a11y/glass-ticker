# glass-ticker-launcher (Maven)

Downloads and launches [Glass Ticker](https://github.com/shounakjoshi88-a11y/glass-ticker),
a frameless acrylic desktop market ticker for Windows.

## Add the dependency

```xml
<dependency>
  <groupId>io.github.shounakjoshi88</groupId>
  <artifactId>glass-ticker-launcher</artifactId>
  <version>2.0.0</version>
</dependency>
```

## Run it

```bash
mvn dependency:get -Dartifact=com.github.shounakjoshi88:glass-ticker-launcher:2.0.0
java -jar ~/.m2/repository/io/github/shounakjoshi88/glass-ticker-launcher/2.0.0/glass-ticker-launcher-2.0.0.jar
```

Or call it from code:

```java
com.github.shounakjoshi88.glassticker.Launcher.main(new String[] { "install" });
```

| Command | What it does |
| --- | --- |
| `launch` (default) | download if needed, then start the app |
| `install` | download the executable without launching |
| `path` | print where the executable lives |
| `version` | print the launcher version |

## How the download works

The launcher fetches `release.json` from the latest GitHub release, downloads
`GlassTicker.exe`, and verifies it against the SHA-256 published in that
manifest. A mismatched download is deleted rather than executed.

The executable is stored in `%LOCALAPPDATA%\GlassTicker` (override with
`GLASS_TICKER_HOME`).

## Building and publishing

```bash
mvn package          # build the jar
mvn -Prelease deploy # publish to Maven Central (needs a Sonatype token)
```

Publishing to Central needs a [Sonatype Central Portal](https://central.sonatype.com/)
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

## License

MIT
