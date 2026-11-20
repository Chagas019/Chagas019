# Jarvis iOS

App SwiftUI (iOS 17+) do Jarvis: conversa por texto/voz, tarefas, memórias, ajustes, widget "Próximas tarefas" e App Intents (Siri/Atalhos em pt-BR).

## Requisitos
- Xcode 16+ (Swift 5.10+) e [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)
- Backend do Jarvis rodando (`jarvis/backend`) e um projeto Supabase (Auth)

## Gerar e abrir o projeto
```sh
cd jarvis/ios
xcodegen generate
open Jarvis.xcodeproj
```
O `.xcodeproj`, `Info.plist` e `.entitlements` são gerados a partir de `project.yml` (não versionados).

## Configuração
Valores padrão ficam em `Config/Debug.xcconfig` e `Config/Release.xcconfig` (sem segredos). Crie `Config/Local.xcconfig` (ignorado pelo git) para sobrescrever:
```
JARVIS_API_URL = http:/$()/192.168.0.10:8787   // IP do Mac ao testar em iPhone físico
SUPABASE_URL = https:/$()/abcd.supabase.co
SUPABASE_ANON_KEY = <anon key pública do projeto>
JARVIS_BUNDLE_PREFIX = com.seunome.jarvis       // bundle id e App Group (group.<prefixo>)
JARVIS_DEV_TOKEN = <JARVIS_DEV_TOKEN do backend> // opcional: pula o login (apenas Debug)
```
Em xcconfig `//` inicia comentário, por isso as URLs usam `:/$()/`. O esquema `jarvis://` (retorno OAuth do Google) já está registrado.

## Rodar no iPhone
1. Selecione o target **Jarvis** e, em *Signing & Capabilities*, escolha seu time pessoal (o widget também).
2. Se mudar `JARVIS_BUNDLE_PREFIX`, o App Group muda junto; o Xcode o registra ao assinar.
3. Run no dispositivo. Permita microfone, reconhecimento de fala e notificações quando solicitado.
Push remoto (APNs) é opcional: exige conta paga e adicionar o entitlement `aps-environment`.

## Testes
O pacote `Packages/JarvisKit` (modelos, API, auth, view models) roda em macOS:
```sh
cd jarvis/ios/Packages/JarvisKit && swift test
```
Build de simulador (CI):
```sh
cd jarvis/ios && xcodegen generate && xcodebuild -project Jarvis.xcodeproj -scheme Jarvis \
  -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```
