export const defaultFiles = [
  {
    name: "index.html",
    language: "html",
    code: `<main class="hero">
  <h1>Code together. Instantly.</h1>
  <button>Launch room</button>
</main>`
  },
  {
    name: "styles.css",
    language: "css",
    code: `.hero {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #1E1E2F;
  color: #E0E0E0;
}`
  },
  {
    name: "main.js",
    language: "javascript",
    code: `const name = "Codefora";
console.log(\`\${name} room is live\`);`
  },
  {
    name: "main.java",
    language: "java",
    code: `class Main {
  public static void main(String[] args) {
    System.out.println("Room compiled successfully");
  }
}`
  }
];
