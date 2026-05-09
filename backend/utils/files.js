export function languageFromName(fileName) {
  if (fileName.endsWith(".html")) return "html";
  if (fileName.endsWith(".css")) return "css";
  if (fileName.endsWith(".java")) return "java";
  if (fileName.endsWith(".py")) return "python";
  if (fileName.endsWith(".cpp")) return "cpp";
  if (fileName.endsWith(".c")) return "c";
  if (fileName.endsWith(".ts")) return "typescript";
  if (fileName.endsWith(".go")) return "go";
  if (fileName.endsWith(".rs")) return "rust";
  return "javascript";
}

export function starterCode(fileName) {
  if (fileName.endsWith(".html")) return "<main>\n  <h1>Hello Codefora</h1>\n</main>";
  if (fileName.endsWith(".css")) return "body {\n  font-family: system-ui, sans-serif;\n}";
  if (fileName.endsWith(".c")) return "#include <stdio.h>\n\nint main(void) {\n  printf(\"Hello Codefora\\n\");\n  return 0;\n}";
  if (fileName.endsWith(".cpp")) return "#include <iostream>\n\nint main() {\n  std::cout << \"Hello Codefora\" << std::endl;\n  return 0;\n}";
  if (fileName.endsWith(".java")) return "class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hello Codefora\");\n  }\n}";
  if (fileName.endsWith(".py")) return "print(\"Hello Codefora\")";
  if (fileName.endsWith(".ts")) return "const message: string = \"Hello Codefora\";\nconsole.log(message);";
  if (fileName.endsWith(".go")) return "package main\n\nimport \"fmt\"\n\nfunc main() {\n  fmt.Println(\"Hello Codefora\")\n}";
  if (fileName.endsWith(".rs")) return "fn main() {\n  println!(\"Hello Codefora\");\n}";
  return "console.log(\"Hello Codefora\");";
}
