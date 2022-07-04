require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = package['name']
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']

  s.authors      = package['author']
  s.homepage     = package['homepage']
  s.platforms    = { :ios => "9.0", :osx => "10.13" }

  s.source       = { :git => "https://devjeff.info", :tag => "v#{s.version}" }
  s.source_files  = "ios/**/*.{h,m}"

  s.frameworks = 'CoreGraphics', 'CoreText'

  s.dependency 'React-Core'
end