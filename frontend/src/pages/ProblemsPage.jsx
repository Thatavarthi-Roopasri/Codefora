import Editor from "@monaco-editor/react";
import { ArrowLeft, Bot, BookOpen, CheckCircle, Loader2, MessageCircle, MessageSquare, Play, Search, Send, Sparkles, Users, X, XCircle, Plus, Lock, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { api } from "../api/client";
import { BrandButton } from "../components/BrandButton";
import { Navbar } from "../components/Navbar";
import { trackEvent } from "../lib/analytics";
import { saveUsername, saveHostToken, saveInviteCode } from "../lib/navigation";
import { useAuth } from "../hooks/useAuth";

const allTags = ["Arrays", "Graphs", "DP", "Trees", "Strings", "Greedy", "Binary Search", "Math"];
const difficulties = ["Easy", "Medium", "Hard"];
const sortOptions = ["Difficulty", "Most Solved", "Newest", "Trending"];
const difficultyWeights = { Easy: 1, Medium: 2, Hard: 3 };

const LANGUAGE_OPTIONS = [
  { label: "C", value: "c", file: "main.c", monaco: "c", template: "#include <stdio.h>\n\nint main(void) {\n  return 0;\n}\n" },
  { label: "C++", value: "cpp", file: "main.cpp", monaco: "cpp", template: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  return 0;\n}\n" },
  { label: "Java", value: "java", file: "Main.java", monaco: "java", template: "import java.util.*;\n\nclass Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n  }\n}\n" },
  { label: "Python", value: "python", file: "main.py", monaco: "python", template: "import sys\n\ndef main():\n    data = sys.stdin.read().strip().split()\n\nif __name__ == \"__main__\":\n    main()\n" },
  { label: "JavaScript", value: "javascript", file: "main.js", monaco: "javascript", template: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\n" },
  { label: "TypeScript", value: "typescript", file: "main.ts", monaco: "typescript", template: "const fs = require('fs');\nconst input: string[] = fs.readFileSync(0, 'utf8').trim().split(/\\s+/);\n" },
  { label: "Go", value: "go", file: "main.go", monaco: "go", template: "package main\n\nimport \"fmt\"\n\nfunc main() {\n  fmt.Println(\"\")\n}\n" },
  { label: "Rust", value: "rust", file: "main.rs", monaco: "rust", template: "use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n}\n" }
];

function normalizeOutput(value) {
  return String(value || "").trim().replace(/\r/g, "").split(/\n+/).map((line) => line.trim().replace(/\s+/g, " ")).join("\n");
}

export function ProblemsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState("Trending");
  const [selectedProblemId, setSelectedProblemId] = useState(null);

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [maxMembers, setMaxMembers] = useState(5);
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState("");

  const [language, setLanguage] = useState("javascript");
  const [codeByLanguage, setCodeByLanguage] = useState(() => Object.fromEntries(LANGUAGE_OPTIONS.map((item) => [item.value, item.template])));
  const [runOutput, setRunOutput] = useState("Ready.");
  const [judgeStatus, setJudgeStatus] = useState("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [problemAiOpen, setProblemAiOpen] = useState(false);
  const [problemAiPrompt, setProblemAiPrompt] = useState("");
  const [problemAiThinking, setProblemAiThinking] = useState(false);
  const [problemAiMessages, setProblemAiMessages] = useState([]);

  const [problems, setProblems] = useState([]);
  const [loadingProblems, setLoadingProblems] = useState(true);

  const selectedProblem = problems.find((problem) => problem.id === selectedProblemId) || null;
  const selectedLanguage = LANGUAGE_OPTIONS.find((item) => item.value === language) || LANGUAGE_OPTIONS[0];
  const code = codeByLanguage[language] || selectedLanguage.template;

  useEffect(() => {
    async function loadProblems() {
      try {
        const data = await api.request("/api/problems");
        setProblems(data);
      } catch (err) {
        console.error("Failed to load problems:", err);
      } finally {
        setLoadingProblems(false);
      }
    }
    loadProblems();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [selectedProblemId]);

  const filteredProblems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return problems
      .filter((problem) => {
        const matchesSearch = !term || [problem.title, problem.difficulty, ...problem.tags].some((field) => field.toLowerCase().includes(term));
        const matchesDifficulty = selectedDifficulty === "All" || problem.difficulty === selectedDifficulty;
        const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => problem.tags.includes(tag));
        return matchesSearch && matchesDifficulty && matchesTags;
      })
      .sort((a, b) => {
        if (sortBy === "Difficulty") return difficultyWeights[a.difficulty] - difficultyWeights[b.difficulty];
        if (sortBy === "Most Solved") return b.acceptance - a.acceptance;
        if (sortBy === "Newest") return b.id.localeCompare(a.id);
        return b.acceptance - a.acceptance;
      });
  }, [search, selectedDifficulty, selectedTags, sortBy]);

  function toggleTag(tag) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  }

  async function runAgainstTests(testCases) {
    const results = [];
    for (const testCase of testCases) {
      const result = await api.runCode({
        language,
        version: undefined,
        code,
        input: testCase.input
      });
      const actual = normalizeOutput(result.stdout || result.executionOutput || result.output);
      const expected = normalizeOutput(testCase.output);
      results.push({
        input: testCase.input,
        expected,
        actual,
        passed: actual === expected,
        raw: result
      });
    }
    return results;
  }

  async function handleCompile() {
    if (!selectedProblem) return;
    setIsRunning(true);
    setJudgeStatus("running");
    setRunOutput("Compiling and running sample test case 1...");
    trackEvent("code_run", { problem_id: selectedProblem.id, language });
    try {
      const [result] = await runAgainstTests([selectedProblem.tests[0]]);
      setJudgeStatus(result.passed ? "accepted" : "wrong");
      setRunOutput([
        result.passed ? "Sample test case passed." : "Wrong answer on sample test case 1.",
        "",
        `Input:\n${result.input}`,
        "",
        `Expected Output:\n${result.expected}`,
        "",
        `Your Output:\n${result.actual || "(empty)"}`
      ].join("\n"));
    } catch (error) {
      setJudgeStatus("wrong");
      setRunOutput(error.message || "Compilation failed.");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSubmit() {
    if (!selectedProblem) return;
    setIsRunning(true);
    setJudgeStatus("running");
    setRunOutput("Submitting against all sample test cases...");
    trackEvent("submission", { problem_id: selectedProblem.id, language });
    try {
      const results = await runAgainstTests(selectedProblem.tests);
      const failed = results.find((result) => !result.passed);
      setJudgeStatus(failed ? "wrong" : "accepted");
      if (!failed) {
        setRunOutput("Program is correct. All sample test cases passed.");
      } else {
        const failedIndex = results.indexOf(failed) + 1;
        setRunOutput([
          `Wrong answer on sample test case ${failedIndex}.`,
          "",
          `Input:\n${failed.input}`,
          "",
          `Expected Output:\n${failed.expected}`,
          "",
          `Your Output:\n${failed.actual || "(empty)"}`
        ].join("\n"));
      }
    } catch (error) {
      setJudgeStatus("wrong");
      setRunOutput(error.message || "Submission failed.");
    } finally {
      setIsRunning(false);
    }
  }

  async function askProblemAi() {
    const question = problemAiPrompt.trim();
    if (!question || problemAiThinking) return;

    const questionMessage = { id: `problem-ai-q-${Date.now()}`, role: "user", text: question };
    setProblemAiMessages((items) => [...items, questionMessage]);
    setProblemAiPrompt("");
    setProblemAiThinking(true);

    const problemContext = selectedProblem
      ? {
          title: selectedProblem.title,
          difficulty: selectedProblem.difficulty,
          statement: selectedProblem.statement,
          constraints: selectedProblem.constraints,
          sampleTests: selectedProblem.tests
        }
      : {
          mode: "problem library",
          visibleProblems: filteredProblems.map((problem) => ({
            title: problem.title,
            difficulty: problem.difficulty,
            tags: problem.tags
          }))
        };

    try {
      const result = await api.askAi({
        prompt: question,
        file: selectedProblem ? selectedLanguage.file : "problems",
        code: selectedProblem ? code : "",
        context: {
          page: "Problems",
          selectedProblem: problemContext,
          selectedLanguage: selectedProblem ? selectedLanguage.label : null,
          currentCode: selectedProblem ? code : "",
          judgeStatus,
          runOutput,
          recentAiChat: problemAiMessages.slice(-8)
        }
      });
      setProblemAiMessages((items) => [
        ...items,
        { id: `problem-ai-a-${Date.now()}`, role: "assistant", text: result.suggestion || "No answer returned." }
      ]);
    } catch (error) {
      setProblemAiMessages((items) => [
        ...items,
        { id: `problem-ai-e-${Date.now()}`, role: "assistant", text: error.message || "AI request failed." }
      ]);
    } finally {
      setProblemAiThinking(false);
    }
  }



  async function handleCreateRoom(e) {
    e?.preventDefault();
    if (creating) return;

    setCreating(true);
    setCreateStatus("");

    try {
      const creatorName = user?.displayName || user?.email?.split("@")[0] || "Developer";
      saveUsername(creatorName);

      const room = await api.createRoom({
        name: roomName.trim() || `Problem Room: ${selectedProblem.title}`,
        username: creatorName,
        visibility: isPublic ? "public" : "private",
        max: Number(maxMembers),
        problemId: selectedProblem.id,
        userId: user?.uid || null
      });

      saveHostToken(room.id, room.hostToken);
      saveInviteCode(room.id, room.inviteCode);
      trackEvent("room_create", { 
        problem_id: selectedProblem.id, 
        visibility: isPublic ? "public" : "private",
        room_id: room.id 
      });
      setCreateStatus("Room created! Redirecting...");
      setTimeout(() => {
        if (room.visibility === "private") navigate(`/code/private/${room.id}`);
        else navigate(`/code/${room.id}`);
      }, 800);
    } catch (error) {
      setCreateStatus(`Error: ${error.message}`);
      setCreating(false);
    }
  }

  return (
    <main className="page-shell problems-shell problem-code-shell">
      <Navbar />

      {!selectedProblem ? (
        <section className="problems-overview-layout">
          <aside className="problem-list-panel problems-overview-filters">
            <div className="problems-search-shell compact-search">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search problems..." />
            </div>

            <div className="filter-group">
              <span className="filter-label">Difficulty</span>
              <div className="filter-pills">
                {["All", ...difficulties].map((difficulty) => (
                  <button
                    key={difficulty}
                    type="button"
                    className={`filter-pill ${selectedDifficulty === difficulty ? "active" : ""}`}
                    onClick={() => setSelectedDifficulty(difficulty)}
                  >
                    {difficulty}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <span className="filter-label">Tags</span>
              <div className="filter-pills filter-pills--wrap">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`filter-pill ${selectedTags.includes(tag) ? "active" : ""}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <label className="sort-mini">
              Sort by
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                {sortOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </aside>

          <section className="problems-overview-panel">
            <div className="problems-overview-head">
              <div>
                <span className="toolbar-eyebrow">Practice Library</span>
                <h1>Choose a problem to solve</h1>
              </div>
              <strong>{filteredProblems.length} problems</strong>
            </div>

            <div className="problems-overview-grid">
              {filteredProblems.map((problem, index) => (
                <button
                  type="button"
                  key={problem.id}
                  className="problem-overview-card"
                  onClick={() => {
                    setSelectedProblemId(problem.id);
                    trackEvent("problem_open", { problem_id: problem.id, title: problem.title });
                    setRunOutput("Ready.");
                    setJudgeStatus("idle");
                  }}
                >
                  <div className="problem-overview-card__top">
                    <span>#{String(index + 1).padStart(2, "0")}</span>
                    <small className={`difficulty-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</small>
                  </div>
                  <h2>{problem.title}</h2>
                  <p>{problem.statement}</p>
                  <div className="problem-tags">
                    {problem.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <div className="problem-overview-card__meta">
                    <span>{problem.acceptance}% acceptance</span>
                    <span>{problem.tests.length} samples</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </section>
      ) : (
      <section className="problem-code-layout no-sidebar">
        <section className="problem-info-panel">
          <div className="problem-info-scroll">
            <button
              type="button"
              className="button secondary problems-back-button problems-back-button--inline"
              onClick={() => setSelectedProblemId(null)}
            >
              <ArrowLeft size={16} />
              <span>All Problems</span>
            </button>
            <span className="toolbar-eyebrow">Problem Info</span>
            <h1>{selectedProblem.title}</h1>
            <div className="problem-info-meta">
              <span className={`problem-difficulty difficulty-${selectedProblem.difficulty.toLowerCase()}`}>{selectedProblem.difficulty}</span>
              <span>{selectedProblem.acceptance}% acceptance</span>
              {selectedProblem.solutionAvailable && <span><BookOpen size={14} /> Solution available</span>}
            </div>

            <button 
              className="button button-primary collaborate-btn" 
              onClick={() => {
                setRoomName(`Problem Room: ${selectedProblem.title}`);
                setShowRoomModal(true);
              }}
              style={{ width: "100%", marginTop: "12px", marginBottom: "12px", backgroundColor: "#FF7F3F", borderColor: "#FF7F3F" }}
            >
              <Users size={18} style={{ marginRight: "8px" }} /> Collaborate & Solve
            </button>

            <p>{selectedProblem.statement}</p>

            <section>
              <h2>Constraints</h2>
              <ul>
                {selectedProblem.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}
              </ul>
            </section>

            {selectedProblem.hint && (
              <section className="problem-hint-section">
                <h2>Hint / Solution</h2>
                <div className="hint-box">
                  <p>{selectedProblem.hint}</p>
                </div>
              </section>
            )}

            <section>
              <h2>Sample Test Cases</h2>
              {selectedProblem.tests.map((test, index) => (
                <article className="sample-case" key={`${selectedProblem.id}-${index}`}>
                  <h3>Sample {index + 1}</h3>
                  <div>
                    <strong>Input</strong>
                    <pre>{test.input}</pre>
                  </div>
                  <div>
                    <strong>Output</strong>
                    <pre>{test.output}</pre>
                  </div>
                </article>
              ))}
            </section>
          </div>
        </section>

        <section className="problem-code-panel">
          <div className="problem-code-toolbar">
            <div className="code-toolbar-left">
              <select className="run-file-select" value={selectedLanguage.file} onChange={() => {}} aria-label="Current file">
                <option>{selectedLanguage.file}</option>
              </select>
              <button className="button primary run-btn" onClick={handleCompile} disabled={isRunning}>
                {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                <span>Run Code</span>
              </button>
            </div>

            <label className="language-picker">
              Language
              <select
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value);
                  setRunOutput("Ready.");
                  setJudgeStatus("idle");
                }}
              >
                {LANGUAGE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="problem-editor-wrap">
            <Editor
              height="100%"
              theme="vs-dark"
              language={selectedLanguage.monaco}
              value={code}
              onChange={(value) => setCodeByLanguage((current) => ({ ...current, [language]: value || "" }))}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineHeight: 24,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
              }}
            />
          </div>

          <div className="problem-action-row">
            <button className="button primary" onClick={handleSubmit} disabled={isRunning}>
              Submit
            </button>
          </div>


          <section className={`problem-output-panel ${judgeStatus}`}>
            <div className="output-title">
              <span>Output</span>
              {judgeStatus === "accepted" && <CheckCircle size={18} />}
              {judgeStatus === "wrong" && <XCircle size={18} />}
              {judgeStatus === "running" && <Loader2 size={18} className="animate-spin" />}
            </div>
            <pre>{runOutput}</pre>
          </section>
        </section>
      </section>
      )}

      <button
        type="button"
        className="problem-ai-fab"
        onClick={() => setProblemAiOpen(!problemAiOpen)}
        aria-label={problemAiOpen ? "Close problem AI assistant" : "Open problem AI assistant"}
      >
        {problemAiOpen ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      <aside className={`problem-ai-panel ${problemAiOpen ? "open" : ""}`} aria-hidden={!problemAiOpen}>
        <div className="problem-ai-header">
          <div>
            <span><Bot size={15} /> AI Assistant</span>
            <strong>{selectedProblem ? selectedProblem.title : "Problem Library"}</strong>
          </div>
          <button type="button" onClick={() => setProblemAiOpen(false)} aria-label="Close problem AI">
            <X size={16} />
          </button>
        </div>

        <div className="problem-ai-messages">
          {problemAiMessages.length === 0 && (
            <div className="assistant-empty">
              <Sparkles size={15} />
              <p>Ask for hints, edge cases, debugging help, or an explanation of the selected problem.</p>
            </div>
          )}
          {problemAiMessages.map((message) => (
            <div key={message.id} className={`ai-message ${message.role === "user" ? "ai-message--user" : "ai-message--assistant"}`}>
              <strong>{message.role === "user" ? "You" : "AI Assistant"}</strong>
              <div className="msg-bubble">
                <p>{message.text}</p>
              </div>
            </div>
          ))}
          {problemAiThinking && (
            <div className="ai-message ai-message--assistant">
              <strong>AI Assistant</strong>
              <div className="msg-bubble"><p>Thinking...</p></div>
            </div>
          )}
        </div>

        <div className="problem-ai-input">
          <input
            value={problemAiPrompt}
            onChange={(event) => setProblemAiPrompt(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && askProblemAi()}
            placeholder="Ask AI about this problem..."
          />
          <button type="button" onClick={askProblemAi} disabled={problemAiThinking || !problemAiPrompt.trim()} aria-label="Ask AI">
            <Send size={16} />
          </button>
        </div>
      </aside>

      {showRoomModal && (
        <div className="profile-modal-overlay" role="dialog" aria-modal="true" aria-label="Create a problem room">
          <form className="profile-modal-card" onSubmit={handleCreateRoom}>
            <div className="profile-modal-header">
              <h3>Create Problem Room</h3>
            </div>
            
            <label className="profile-input-group">
              Room Name
              <input
                autoFocus
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
              />
            </label>

            <label className="profile-input-group">
              Room Size (Members)
              <select value={maxMembers} onChange={(e) => setMaxMembers(Number(e.target.value))}>
                <option value="2">2 Members</option>
                <option value="3">3 Members</option>
                <option value="4">4 Members</option>
                <option value="5">5 Members</option>
              </select>
            </label>

            <label className="profile-input-group">
              Room Mode
              <div className="room-mode-toggle" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "8px" }}>
                <button
                  type="button"
                  style={{
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    borderRadius: "8px",
                    border: isPublic ? "2px solid var(--primary)" : "1px solid var(--line)",
                    background: isPublic ? "var(--primary)" : "var(--field)",
                    color: isPublic ? "#1b1020" : "var(--text)",
                    fontWeight: "800",
                    cursor: "pointer",
                    transition: "all 180ms ease"
                  }}
                  onClick={() => setIsPublic(true)}
                >
                  <Zap size={16} /> Public
                </button>
                <button
                  type="button"
                  style={{
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    borderRadius: "8px",
                    border: !isPublic ? "2px solid var(--primary)" : "1px solid var(--line)",
                    background: !isPublic ? "var(--primary)" : "var(--field)",
                    color: !isPublic ? "#1b1020" : "var(--text)",
                    fontWeight: "800",
                    cursor: "pointer",
                    transition: "all 180ms ease"
                  }}
                  onClick={() => setIsPublic(false)}
                >
                  <Lock size={16} /> Private
                </button>
              </div>
            </label>

            {createStatus && <p className={`form-status ${createStatus.startsWith("Error") ? "error" : ""}`}>{createStatus}</p>}

            <div className="profile-modal-footer">
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setShowRoomModal(false);
                  setCreateStatus("");
                }}
                disabled={creating}
              >
                Cancel
              </button>
              <button type="submit" className="button primary" disabled={creating}>
                {creating ? "Creating..." : "Create Room"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
