# Syn2Sem (STOS) - Syntax to Semantics Code Translation Engine

Syn2Sem is a powerful, locally-hosted code translation tool designed primarily for students and developers. It allows seamless translation of source code across 5 major programming languages (Python, JavaScript, Java, C, and C++) supporting all **25 possible language translation pairs**.

## 🚀 Features

- **25-Pair Language Translation:** Convert code between Python, JavaScript, Java, C, and C++.
- **Local AST Compiler (Tree-sitter):** A custom-built, zero-dependency compiler that parses code into an Abstract Syntax Tree (AST) and emits target code instantly. **100% Offline.**
- **Run Code Panel:** Compile and execute C, C++, Java, Python, and JavaScript directly in the browser's terminal.
- **Advanced Code Analysis:**
  - Time & Space Complexity estimation (Big-O).
  - Semantic breakdown and logic explanation.
  - Halstead complexity metrics.
- **Syntax Checking:** Pre-translation syntax validation using Tree-sitter.
- **Export & Integrations:** Export translated code to PDF or open it directly in VS Code.

## 🛠️ Tech Stack

- **Backend:** Node.js (Raw HTTP module, no Express)
- **Frontend:** HTML, Vanilla CSS, JavaScript
- **Parsers:** [Tree-sitter](https://tree-sitter.github.io/tree-sitter/) (for AST extraction)

## 📦 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/nandishdev/syntax-to-semantics-syn2sem-.git
   cd syntax-to-semantics-syn2sem-
   ```

2. **Install dependencies:**
   Navigate to the frontend folder and install the required Tree-sitter packages.
   ```bash
   cd frontend
   npm install
   ```

## 🚀 Usage

1. **Start the server:**
   ```bash
   cd frontend
   node server.js
   ```
2. **Open the app:**
   Navigate to `http://localhost:3000` in your web browser.
3. Paste your code, select the source and target languages, and hit **Translate**!

## 🧠 How the AST Compiler Works

Syn2Sem uses a custom 4-stage AST Compiler to translate code:
1. **Parse:** Uses Tree-sitter to generate an Abstract Syntax Tree of the source code.
2. **Extract:** Identifies classes, methods, parameters, and variable declarations.
3. **Type Inference:** Dynamically infers data types when translating from dynamically typed languages (JS/Python) to statically typed ones (Java/C/C++).
4. **Emit:** Reconstructs the code using language-specific emitters, injecting standard libraries and converting idioms where necessary.
