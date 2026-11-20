import Foundation

/// Erros do contrato (`error.code`) e de infraestrutura, com mensagens em pt-BR.
public enum JarvisError: Error, Equatable, LocalizedError, Sendable {
    case badRequest(String)
    case unauthorized
    case forbidden
    case notFound
    case rateLimited
    case budgetExceeded
    case providerUnavailable
    case server(String)
    case network(String)
    case decoding(String)
    case auth(String)
    case notConfigured(String)
    case unknown(status: Int, message: String)

    /// Converte `{ error: { code, message } }` + status HTTP em erro tipado.
    public static func from(code: String?, message: String?, status: Int) -> JarvisError {
        let msg = message ?? ""
        switch code {
        case "bad_request": return .badRequest(msg)
        case "unauthorized": return .unauthorized
        case "forbidden": return .forbidden
        case "not_found": return .notFound
        case "rate_limited": return .rateLimited
        case "budget_exceeded": return .budgetExceeded
        case "provider_unavailable": return .providerUnavailable
        case "internal": return .server(msg)
        default:
            switch status {
            case 400: return .badRequest(msg)
            case 401: return .unauthorized
            case 403: return .forbidden
            case 404: return .notFound
            case 429: return .rateLimited
            case 502, 503: return .providerUnavailable
            case 500...599: return .server(msg)
            default: return .unknown(status: status, message: msg)
            }
        }
    }

    public var errorDescription: String? {
        switch self {
        case .badRequest(let m):
            return m.isEmpty ? "Requisição inválida." : "Requisição inválida: \(m)"
        case .unauthorized:
            return "Sua sessão expirou. Entre novamente."
        case .forbidden:
            return "Você não tem permissão para realizar esta ação."
        case .notFound:
            return "Item não encontrado."
        case .rateLimited:
            return "Muitas solicitações. Aguarde um instante e tente de novo."
        case .budgetExceeded:
            return "O orçamento diário de IA foi atingido. Tente novamente amanhã."
        case .providerUnavailable:
            return "Nenhum provedor de IA está disponível no momento."
        case .server(let m):
            return m.isEmpty ? "Erro no servidor. Tente novamente." : "Erro no servidor: \(m)"
        case .network(let m):
            return "Sem conexão com o servidor. \(m)"
        case .decoding:
            return "Resposta inesperada do servidor."
        case .auth(let m):
            return m
        case .notConfigured(let m):
            return "Configuração ausente: \(m)"
        case .unknown(let status, let m):
            return "Erro inesperado (\(status)). \(m)"
        }
    }
}
