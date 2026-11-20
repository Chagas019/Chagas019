import Foundation

// Espelho de jarvis/backend/src/core/types.ts (JSON camelCase).

public enum Role: String, Codable, Sendable {
    case user, assistant, tool, system

    public init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = Role(rawValue: raw) ?? .system
    }
}

public struct Message: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let conversationId: String
    public let role: Role
    public let content: String
    public let createdAt: Date
    public let meta: [String: JSONValue]?
}

public struct Conversation: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let userId: String
    public let title: String
    public let createdAt: Date
    public let updatedAt: Date
}

public enum MemoryKind: String, Codable, CaseIterable, Sendable {
    case fact, preference, summary

    public init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = MemoryKind(rawValue: raw) ?? .fact
    }

    public var displayName: String {
        switch self {
        case .fact: return "Fato"
        case .preference: return "Preferência"
        case .summary: return "Resumo"
        }
    }
}

public struct Memory: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let userId: String
    public let kind: MemoryKind
    public let content: String
    public let createdAt: Date
}

public enum TaskStatus: String, Codable, Sendable {
    case open, done

    public init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = TaskStatus(rawValue: raw) ?? .open
    }
}

public struct JarvisTask: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let userId: String
    public let title: String
    public let notes: String?
    public let dueAt: Date?
    public let status: TaskStatus
    public let createdAt: Date
}

/// Corpo do PATCH /v1/tasks/:id (campos nulos são omitidos).
public struct TaskPatch: Encodable, Sendable {
    public var title: String?
    public var notes: String?
    public var dueAt: Date?
    public var status: TaskStatus?

    public init(title: String? = nil, notes: String? = nil, dueAt: Date? = nil, status: TaskStatus? = nil) {
        self.title = title
        self.notes = notes
        self.dueAt = dueAt
        self.status = status
    }
}

public enum ToolStatus: String, Codable, Sendable {
    case ok, error, denied
    case pendingConfirmation = "pending_confirmation"

    public init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = ToolStatus(rawValue: raw) ?? .error
    }
}

public typealias AuditStatus = ToolStatus

public struct AuditEvent: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let userId: String
    public let actor: String
    public let action: String
    public let status: AuditStatus
    public let detail: [String: JSONValue]?
    public let createdAt: Date
}

public enum ChatMode: String, Codable, Sendable {
    case auto, fast, deep
}

public struct ChatRequest: Codable, Equatable, Sendable {
    public var conversationId: String?
    public var message: String
    public var mode: ChatMode?
    public var confirm: Bool?

    public init(conversationId: String? = nil, message: String, mode: ChatMode? = nil, confirm: Bool? = nil) {
        self.conversationId = conversationId
        self.message = message
        self.mode = mode
        self.confirm = confirm
    }
}

public struct ToolCallSummary: Codable, Equatable, Sendable {
    public let name: String
    public let status: ToolStatus

    public init(name: String, status: ToolStatus) {
        self.name = name
        self.status = status
    }
}

public struct PendingConfirmation: Codable, Equatable, Sendable {
    public let summary: String

    public init(summary: String) {
        self.summary = summary
    }
}

public struct ChatUsage: Codable, Equatable, Sendable {
    public let inputTokens: Int
    public let outputTokens: Int
    public let costUsd: Double
}

public struct ChatResponse: Codable, Equatable, Sendable {
    public let conversationId: String
    public let reply: String
    public let provider: String
    public let model: String
    public let toolCalls: [ToolCallSummary]
    public let pendingConfirmation: PendingConfirmation?
    public let usage: ChatUsage
}

// MARK: - Respostas auxiliares das rotas

public struct ListResponse<Item: Codable & Sendable>: Codable, Sendable {
    public let items: [Item]
}

public struct MeResponse: Codable, Equatable, Sendable {
    public let userId: String
    public let email: String?
}

public struct OkResponse: Codable, Equatable, Sendable {
    public let ok: Bool
}

public struct HealthResponse: Codable, Equatable, Sendable {
    public let ok: Bool
    public let version: String?
    public let providers: [String]?
    public let db: String?
}

public struct UsageItem: Codable, Equatable, Sendable {
    public let provider: String
    public let model: String
    public let calls: Int
    public let inputTokens: Int
    public let outputTokens: Int
    public let costUsd: Double

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        provider = try c.decodeIfPresent(String.self, forKey: .provider) ?? ""
        model = try c.decodeIfPresent(String.self, forKey: .model) ?? ""
        calls = try c.decodeIfPresent(Int.self, forKey: .calls) ?? 0
        inputTokens = try c.decodeIfPresent(Int.self, forKey: .inputTokens) ?? 0
        outputTokens = try c.decodeIfPresent(Int.self, forKey: .outputTokens) ?? 0
        costUsd = try c.decodeIfPresent(Double.self, forKey: .costUsd) ?? 0
    }

    private enum CodingKeys: String, CodingKey {
        case provider, model, calls, inputTokens, outputTokens, costUsd
    }
}

public struct UsageResponse: Codable, Equatable, Sendable {
    public let limitUsd: Double
    public let spentUsd: Double
    public let items: [UsageItem]

    /// Fração (0...1) do orçamento diário consumida.
    public var fractionUsed: Double {
        guard limitUsd > 0 else { return 0 }
        return min(max(spentUsd / limitUsd, 0), 1)
    }
}

public struct GoogleIntegrationStatus: Codable, Equatable, Sendable {
    public let configured: Bool
    public let connected: Bool
    public let scopes: [String]
}

public struct IntegrationsResponse: Codable, Equatable, Sendable {
    public let google: GoogleIntegrationStatus
}

struct URLResponseBody: Decodable {
    let url: String
}

struct ErrorEnvelope: Decodable {
    struct Body: Decodable {
        let code: String
        let message: String
    }
    let error: Body
}
