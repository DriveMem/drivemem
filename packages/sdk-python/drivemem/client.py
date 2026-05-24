"""DriveMem Python SDK — connect any AI agent to shared knowledge."""

import requests
from typing import Optional, List, Dict, Any


class DriveMem:
    """DriveMem client for AI agent integration.
    
    Usage:
        mem = DriveMem(api_key="ak_your_key")
        results = mem.search("product strategy")
        answer = mem.ask("What decisions were made?")
        mem.store("Decision: target AI devs first", title="Strategy")
        briefing = mem.compile("Write a go-to-market plan")
    """

    def __init__(self, api_key: str, endpoint: str = "https://drivemem.cloud"):
        self.api_key = api_key
        self.endpoint = endpoint.rstrip("/")
        self._session = requests.Session()
        self._session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        })

    def _request(self, method: str, path: str, **kwargs) -> Dict[str, Any]:
        url = f"{self.endpoint}{path}"
        response = self._session.request(method, url, **kwargs)
        if not response.ok:
            try:
                error = response.json()
                msg = error.get("message") or error.get("error") or f"HTTP {response.status_code}"
            except Exception:
                msg = f"HTTP {response.status_code}"
            raise Exception(f"DriveMem API error: {msg}")
        return response.json()

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Semantic search across knowledge base."""
        data = self._request("GET", f"/api/v1/search?q={requests.utils.quote(query)}&limit={limit}")
        return data.get("results", [])

    def ask(self, question: str) -> Dict[str, Any]:
        """Ask a question — get AI answer with citations."""
        return self._request("POST", "/api/v1/ask", json={"question": question})

    def store(self, content: str, title: Optional[str] = None, tags: Optional[str] = None) -> Dict[str, Any]:
        """Store knowledge."""
        body: Dict[str, Any] = {"content": content}
        if title:
            body["title"] = title
        if tags:
            body["tags"] = tags
        return self._request("POST", "/api/v1/store", json=body)

    def compile(self, task: str, token_budget: int = 8000, project: Optional[str] = None, 
                tags: Optional[List[str]] = None, recency: Optional[str] = None) -> Dict[str, Any]:
        """Compile context briefing for a task."""
        body: Dict[str, Any] = {"task": task, "tokenBudget": token_budget}
        hints: Dict[str, Any] = {}
        if project:
            hints["project"] = project
        if tags:
            hints["tags"] = tags
        if recency:
            hints["recency"] = recency
        if hints:
            body["hints"] = hints
        return self._request("POST", "/api/v1/context/compile", json=body)

    def files(self, detail: str = "brief") -> List[Dict[str, Any]]:
        """List files."""
        data = self._request("GET", f"/api/v1/files?detail={detail}")
        return data.get("files", [])

    def ping(self) -> bool:
        """Verify connection."""
        try:
            self.search("test", limit=1)
            return True
        except Exception:
            return False

    # --- Handoff methods ---

    def handoff_send(self, to_user_email: str, workspace_id: str, task: str, next_steps: List[str],
                     decisions: Optional[List[Dict[str, Any]]] = None,
                     key_facts: Optional[List[str]] = None,
                     notes: Optional[str] = None) -> Dict[str, Any]:
        """Send a handoff to another user."""
        body: Dict[str, Any] = {
            "toUserEmail": to_user_email,
            "workspaceId": workspace_id,
            "task": task,
            "nextSteps": next_steps,
        }
        if decisions is not None:
            body["decisions"] = decisions
        if key_facts is not None:
            body["keyFacts"] = key_facts
        if notes is not None:
            body["notes"] = notes
        return self._request("POST", "/api/v1/handoffs", json=body)

    def handoff_accept(self, handoff_id: str) -> Dict[str, Any]:
        """Accept a handoff."""
        return self._request("POST", f"/api/v1/handoffs/{handoff_id}/accept", json={})

    def handoff_request_more(self, handoff_id: str, questions: List[str]) -> Dict[str, Any]:
        """Request more information on a handoff."""
        return self._request("POST", f"/api/v1/handoffs/{handoff_id}/request-more", json={"questions": questions})

    def handoff_list(self, role: Optional[str] = None, status: Optional[str] = None,
                     workspace_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List handoffs."""
        params: Dict[str, str] = {}
        if role:
            params["role"] = role
        if status:
            params["status"] = status
        if workspace_id:
            params["workspaceId"] = workspace_id
        qs = "&".join(f"{k}={requests.utils.quote(v)}" for k, v in params.items())
        path = f"/api/v1/handoffs?{qs}" if qs else "/api/v1/handoffs"
        data = self._request("GET", path)
        return data.get("handoffs", [])

    def handoff_get(self, handoff_id: str) -> Dict[str, Any]:
        """Get a single handoff by ID."""
        return self._request("GET", f"/api/v1/handoffs/{handoff_id}")
