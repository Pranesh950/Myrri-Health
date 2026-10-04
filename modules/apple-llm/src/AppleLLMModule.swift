import ExpoModulesCore
import Foundation

#if canImport(FoundationModels)
import FoundationModels
#endif

public class AppleLLMModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleLLMModule")

    Function("isAvailable") {
      if #available(iOS 26.0, *) {
        #if canImport(FoundationModels)
        return true
        #else
        return false
        #endif
      }
      return false
    }

    AsyncFunction("generate") { (prompt: String, systemPrompt: String) -> String in
      guard #available(iOS 26.0, *) else {
        throw ModuleError("Apple Foundation Models require iOS 26+")
      }

      #if canImport(FoundationModels)
      do {
        let session = LanguageModelSession(instructions: systemPrompt)
        let response = try await session.respond(to: prompt)
        return response.content
      } catch {
        throw ModuleError("Apple LLM generation failed: \(error.localizedDescription)")
      }
      #else
      throw ModuleError("FoundationModels framework not available")
      #endif
    }
  }

  struct ModuleError: Error, CustomStringConvertible {
    let description: String
    init(_ msg: String) { self.description = msg }
  }
}
