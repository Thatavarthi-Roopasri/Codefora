# Codefora

<p align="center">
  <em>A unified, browser-based collaborative coding environment purpose-built for technical interviews, pair programming, and competitive coding.</em>
</p>

<p align="center">
  <a href="https://codefora.online/"><strong>Live Demo</strong></a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#architecture--design-decisions">Architecture</a> ·
  <a href="#roadmap">Roadmap</a>
</p>

---

<!-- SUGGESTION: Insert a clean, high-resolution screenshot or GIF showing the Monaco editor, the canvas scratchpad, and the real-time preview updating simultaneously. -->
![Codefora Interface Preview](https://via.placeholder.com/1000x500.png?text=Codefora+Workspace+Preview)

## Why Codefora?

Traditional collaborative coding often requires developers to assemble a fragmented toolchain: an IDE plugin for code synchronization (like VS Code Live Share), a separate app for voice communication (Discord/Zoom), a digital whiteboard (Excalidraw), and an external platform for problem statements (LeetCode). 

While local IDEs remain the undisputed standard for daily software engineering, this fragmented approach introduces unnecessary setup overhead for ephemeral, focused sessions like technical interviews, algorithmic pair programming, or hackathons.

**Codefora solves this by reducing the "time to first line of code" to zero.** It provides a fully unified, cloud-based workspace accessible via a single URL. By combining a code editor, real-time synchronization, voice chat, whiteboarding, and secure remote execution into one platform, Codefora allows developers to focus entirely on problem-solving rather than environment configuration.

### The Unified Workflow

| Capability | Fragmented Workflow | Codefora Unified Workspace |
| :--- | :--- | :--- |
| **Code Editing** | Local IDE + Extension + Auth | Browser-based Monaco Editor |
| **Communication** | External Voice/Video App | Built-in WebRTC Audio |
| **Whiteboarding** | External Browser Tab | Integrated Canvas Scratchpad |
| **Code Execution** | Local runtimes & dependencies | Isolated cloud execution via Judge0 API |
| **State Sync** | Centralized Operational Transformation | Decentralized CRDTs (Yjs) |

## Core Features

*   **Real-Time Collaborative Editing:** Utilizes Yjs (Conflict-free Replicated Data Types) for decentralized, conflict-free document synchronization, optimized for reliability across diverse network conditions.
*   **Multi-File Projects:** Support for full directory structures. WebSocket connections dynamically subscribe to active files, optimizing bandwidth and local memory usage.
*   **Live Web Previews:** An integrated rendering engine that previews frontend projects (HTML/CSS/JS) as they are typed, without requiring external bundlers.
*   **Sandboxed Remote Execution:** Backend languages (Python, Java, C++, Rust, etc.) are compiled and executed safely in the cloud via the Judge0 API, supporting custom standard input (`stdin`) and streaming output (`stdout`).
*   **Integrated WebRTC Audio:** Built-in peer-to-peer voice communication directly inside the room.
*   **Canvas Scratchpad:** A synchronized HTML5 drawing canvas designed for sketching system architectures and algorithm data structures.
*   **Problem Library & Auto-Grader:** Built-in algorithm problem sets with automated test-case validation.
*   **Context-Aware AI Assistant:** Integrated Groq Llama-3 assistant that reads the current room state, code, and problem statement to provide targeted hints and debugging suggestions.
*   **Granular Room Controls:** Host-level permissions to manage room visibility, moderate participants, restrict AI usage, and disable copy/pasting for strict interview environments.

---

## Architecture & Design Decisions

<!-- SUGGESTION: Insert a Mermaid.js diagram illustrating the data flow between the React Client, Y-Websocket server, Firebase, and External APIs. -->

Codefora is engineered for real-time performance and horizontal scalability. 

*   **Frontend (React 18, Vite):** The UI is built around the Monaco Editor. We specifically override Monaco's native Windows CRLF line-endings to standard LF to prevent cross-platform CRDT index drifting—a common pitfall in browser-based collaborative editors.
*   **Synchronization (Yjs & WebSockets):** We chose CRDTs over traditional Operational Transformation (OT) to eliminate centralized locking mechanisms. `y-websocket` handles document state replication, while ephemeral events (cursors, typing indicators, presence) are broadcasted via `Socket.io`.
*   **Persistence & Auth (Firebase):** Firebase Admin SDK and Firestore manage user authentication, room metadata, and historical session data.
*   **External Integrations:** 
    *   **Judge0 API:** Provides secure, isolated execution environments for arbitrary code compilation.
    *   **Groq API:** Powers the Llama-3 AI assistant for contextual inference.

---

## Roadmap

Our vision is to build the premier platform for competitive collaborative coding.

### 📍 Phase 1: The Core Collaborative Room (Current Focus)
- Stabilize CRDT synchronization for large, multi-file projects.
- Expand the built-in competitive problem library and test suites.
- Optimize WebRTC audio infrastructure for stability across various NAT configurations.

### 🚀 Phase 2: Room vs. Room Competitions
- Introduce competitive formats where isolated teams can race to solve problem sets.
- Implement shared test-case passing metrics and team-level leaderboards.
- Expand the Canvas Scratchpad with structured tools (shapes, text boxes, exports).

### 🔭 Phase 3: The Competitive Ecosystem
- Establish Codefora as a host for team-based hackathons and algorithmic tournaments.
- Implement "Interview Replays"—DVR-style playback of coding sessions for technical interview reviews and post-mortems.

---

## Getting Started

### Prerequisites
*   Node.js (v18+)
*   Firebase Project (for Authentication and Firestore)
*   Groq API Key (optional, for AI features)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/ganeshvanamala/Codefora.git
   cd Codefora
   ```

2. **Setup the Backend**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory:
   ```env
   PORT=5000
   AI_PROVIDER=groq
   GROQ_API_KEY=your_groq_api_key
   ```
   *Note: Add your Firebase Admin SDK service account file as `firebase-key.json` in the root backend directory.*

   Start the backend server:
   ```bash
   npm run dev
   ```

3. **Setup the Frontend**
   ```bash
   cd ../frontend
   npm install
   ```
   Create a `.env` file in the `frontend` directory:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
   Start the Vite development server:
   ```bash
   npm run dev
   ```

4. **Run the Application**
   Navigate to `http://localhost:5173` in your browser.

---

## Contributing

We welcome contributions from the community! Whether it's fixing bugs, optimizing CRDT performance, or expanding the problem library, your help is appreciated. 

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

Please ensure your code adheres to the existing style and that any new features are thoroughly tested.
