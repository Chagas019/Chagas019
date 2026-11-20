import SwiftUI
import JarvisKit

struct LoginView: View {
    @ObservedObject var session: SessionViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var useAccessToken = true
    @State private var accessToken = ""
    @FocusState private var focus: Field?

    private enum Field { case email, password }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Image(systemName: "waveform.circle.fill")
                    .font(.system(size: 76))
                    .foregroundStyle(Color.accentColor)
                    .padding(.top, 60)
                Text("Jarvis")
                    .font(.largeTitle.weight(.bold))
                Text(isSignUp ? "Crie sua conta" : "Entre para continuar")
                    .foregroundStyle(.secondary)

                VStack(spacing: 12) {
                    TextField("E-mail", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($focus, equals: .email)
                        .submitLabel(.next)
                        .onSubmit { focus = .password }
                        .flatCard()
                    SecureField("Senha", text: $password)
                        .textContentType(isSignUp ? .newPassword : .password)
                        .focused($focus, equals: .password)
                        .submitLabel(.go)
                        .onSubmit { Task { await submit() } }
                        .flatCard()
                }

                if let error = session.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }
                if let info = session.infoMessage {
                    Text(info)
                        .font(.footnote)
                        .foregroundStyle(.green)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task { await submit() }
                } label: {
                    Group {
                        if session.isBusy {
                            ProgressView().tint(.white)
                        } else {
                            Text(isSignUp ? "Criar conta" : "Entrar").fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity, minHeight: 28)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(email.isEmpty || password.isEmpty || session.isBusy)

                Button(isSignUp ? "Já tenho conta" : "Criar uma conta") {
                    withAnimation { isSignUp.toggle() }
                    session.errorMessage = nil
                    session.infoMessage = nil
                }
                .font(.subheadline)

                Divider().padding(.vertical, 8)

                DisclosureGroup("Entrar com token de acesso", isExpanded: $useAccessToken) {
                    VStack(spacing: 12) {
                        SecureField("Cole o JARVIS_OWNER_TOKEN", text: $accessToken)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .flatCard()
                        Button {
                            Task { await session.signIn(accessToken: accessToken) }
                        } label: {
                            Text("Entrar com token").fontWeight(.semibold).frame(maxWidth: .infinity, minHeight: 28)
                        }
                        .buttonStyle(.bordered)
                        .controlSize(.large)
                        .disabled(accessToken.isEmpty || session.isBusy)
                    }
                    .padding(.top, 8)
                }
                .font(.subheadline)
            }
            .padding(.horizontal, 24)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func submit() async {
        focus = nil
        if isSignUp {
            await session.signUp(email: email, password: password)
        } else {
            await session.signIn(email: email, password: password)
        }
    }
}
