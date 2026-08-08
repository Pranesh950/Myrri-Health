import ExpoModulesCore
import Foundation

#if canImport(FoundationModels)
import FoundationModels
#endif

public class AppleLLMModule: Module {
  private var model: Any? = nil

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
        let llm = try await LLM.load(.appleEmbeddedModel)

        let messages: [LLM.Message] = [
          LLM.Message(role: .system, content: systemPrompt),
          LLM.Message(role: .user, content: prompt),
        ]

        let parameters = LLM.Parameters(
          temperature: 0.7,
          maxTokens: 512,
          topP: 0.9
        )

        let result = try await llm.generate(messages: messages, parameters: parameters)
        return result.text
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
