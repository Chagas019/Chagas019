#!/usr/bin/env bash
# Gera Orbita-Contas.apk sem o Android SDK, usando ferramentas de codigo aberto:
# android-all (Robolectric) para compilar, dx para gerar o dex, apktool para montar e uber-apk-signer para assinar.
set -euo pipefail
cd "$(dirname "$0")"
T=build-tools; mkdir -p "$T" build/cls build/proj
M=https://repo1.maven.org/maven2
[ -f $T/android-all.jar ] || curl -fsSL -o $T/android-all.jar $M/org/robolectric/android-all/9-robolectric-4913185-2/android-all-9-robolectric-4913185-2.jar
[ -f $T/dx.jar ] || curl -fsSL -o $T/dx.jar $M/com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar
[ -f $T/apktool.jar ] || curl -fsSL -o $T/apktool.jar https://github.com/iBotPeaches/Apktool/releases/download/v2.10.0/apktool_2.10.0.jar
[ -f $T/uber.jar ] || curl -fsSL -o $T/uber.jar https://github.com/patrickfav/uber-apk-signer/releases/download/v1.3.0/uber-apk-signer-1.3.0.jar
javac --release 8 -nowarn -cp $T/android-all.jar -d build/cls src/com/orbita/contas/MainActivity.java
cp -r AndroidManifest.xml apktool.yml res assets build/proj/
java -cp $T/dx.jar com.android.dx.command.Main --dex --min-sdk-version=21 --output=build/proj/classes.dex build/cls
java -jar $T/apktool.jar b build/proj -o build/unsigned.apk
java -jar $T/uber.jar -a build/unsigned.apk -o build/out
cp build/out/*-aligned-debugSigned.apk Orbita-Contas.apk
echo "Pronto: $(pwd)/Orbita-Contas.apk"
