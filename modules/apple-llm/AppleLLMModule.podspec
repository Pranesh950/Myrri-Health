require 'json'

Pod::Spec.new do |s|
  s.name           = 'AppleLLMModule'
  s.version        = '1.0.0'
  s.summary        = 'Expo module bridging Apple Foundation Models'
  s.homepage       = 'https://github.com/example/apple-llm'
  s.license        = 'MIT'
  s.author         = 'Health App'
  s.source         = { git: '' }
  s.static_framework = true
  s.platforms      = { ios: '26.0' }
  s.source_files   = 'src/**/*.swift'
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
end
