import Foundation

/// Datas ISO-8601 UTC, com ou sem frações de segundo.
public enum JarvisDate {
    public static func parse(_ string: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = formatter.date(from: string) { return d }
        formatter.formatOptions = [.withInternetDateTime]
        if let d = formatter.date(from: string) { return d }
        // Postgres pode enviar microssegundos (ex.: .123456): corta para milissegundos.
        if let range = string.range(of: #"\.(\d{3})\d+"#, options: .regularExpression) {
            let ms = String(string[range].prefix(4))
            var trimmed = string
            trimmed.replaceSubrange(range, with: ms)
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            return formatter.date(from: trimmed)
        }
        return nil
    }

    public static func string(from date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date)
    }
}

public enum JarvisCoding {
    public static func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { d in
            let c = try d.singleValueContainer()
            let s = try c.decode(String.self)
            if let date = JarvisDate.parse(s) { return date }
            throw DecodingError.dataCorruptedError(in: c, debugDescription: "Data inválida: \(s)")
        }
        return decoder
    }

    public static func makeEncoder() -> JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .custom { date, e in
            var c = e.singleValueContainer()
            try c.encode(JarvisDate.string(from: date))
        }
        return encoder
    }
}
