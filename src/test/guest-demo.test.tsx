import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import GuestDemoPage from "../pages/GuestDemoPage";

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() { return values.size; },
  });
  vi.stubGlobal("fetch", vi.fn());
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShowModal); else delete HTMLDialogElement.prototype.showModal;
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose); else delete HTMLDialogElement.prototype.close;
});
const openDemo = () => render(<MemoryRouter><GuestDemoPage /></MemoryRouter>);

describe("Bells guest workspace", () => {
  it("creates, reviews, approves, and persists a task without a network request", () => {
    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "New task" }));
    const creation = within(screen.getByRole("dialog"));
    fireEvent.click(creation.getByRole("button", { name: "Create task" }));
    expect(creation.getByRole("alert")).toHaveTextContent("Give your task a title");
    fireEvent.change(creation.getByLabelText("Task title"), { target: { value: "Verify the handoff" } });
    fireEvent.click(creation.getByRole("button", { name: "Create task" }));
    fireEvent.click(screen.getByRole("button", { name: "Open task: Verify the handoff" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Send for review" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Approve task" }));
    expect(screen.getByText("Task approved.")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("bells-demo-v1")!).tasks.find((task: { title: string }) => task.title === "Verify the handoff").status).toBe("Approved");
    expect(fetch).not.toHaveBeenCalled();
    cleanup();
    openDemo();
    expect(screen.getByLabelText("Status for Verify the handoff")).toHaveValue("Approved");
  });

  it("recovers from malformed storage and resets edits only after confirmation", () => {
    localStorage.setItem("bells-demo-v1", '{"version":1,"tasks":[{"title":"invalid"}]}');
    openDemo();
    fireEvent.change(screen.getByLabelText("Status for Design the homepage"), { target: { value: "Approved" } });
    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep exploring" }));
    expect(screen.getByLabelText("Status for Design the homepage")).toHaveValue("Approved");
    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reset demo" }));
    expect(screen.getByLabelText("Status for Design the homepage")).toHaveValue("In progress");
    expect(JSON.parse(localStorage.getItem("bells-demo-v1")!).tasks).toHaveLength(5);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("migrates existing version-one tasks without losing user edits", () => {
    localStorage.setItem("bells-demo-v1", JSON.stringify({
      version: 1,
      tasks: [
        { id: "sample-homepage", title: "My revised homepage", description: "Keep the user-written brief.", status: "Approved", owner: "alex", tag: "Design" },
        { id: "guest-existing", title: "My saved follow-up", description: "A task from the previous demo.", status: "In review", owner: "you", tag: "Your task" },
      ],
      activity: ["Created a task in the previous demo."],
    }));
    openDemo();
    expect(screen.getByLabelText("Status for My revised homepage")).toHaveValue("Approved");
    expect(screen.getByLabelText("Status for My saved follow-up")).toHaveValue("In review");
    fireEvent.click(screen.getByRole("button", { name: "Open task: My revised homepage" }));
    expect(within(screen.getByRole("dialog")).getByText("Keep the user-written brief.")).toBeInTheDocument();
    const migrated = JSON.parse(localStorage.getItem("bells-demo-v1")!);
    expect(migrated.version).toBe(2);
    expect(migrated.tasks).toHaveLength(2);
    expect(migrated.tasks.find((task: { id: string }) => task.id === "guest-existing")).toMatchObject({
      title: "My saved follow-up", description: "A task from the previous demo.", status: "In review", owner: "you", tag: "Your task",
    });
    cleanup();
    openDemo();
    expect(screen.getByLabelText("Status for My revised homepage")).toHaveValue("Approved");
    expect(screen.getByLabelText("Status for My saved follow-up")).toHaveValue("In review");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("creates a project, saves review feedback, and persists approval of its assigned task", () => {
    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "New Project" }));
    const projectForm = within(screen.getByRole("dialog"));
    fireEvent.change(projectForm.getByLabelText("Project name"), { target: { value: "Demo release" } });
    fireEvent.change(projectForm.getByLabelText("Description"), { target: { value: "Prepare the next sample release." } });
    fireEvent.click(projectForm.getByRole("button", { name: "Create Project" }));
    const projectId = JSON.parse(localStorage.getItem("bells-demo-v1")!).projects.find((project: { name: string }) => project.name === "Demo release").id;

    fireEvent.click(screen.getByRole("button", { name: "New task" }));
    const taskForm = within(screen.getByRole("dialog"));
    fireEvent.change(taskForm.getByLabelText("Task title"), { target: { value: "Prepare release notes" } });
    fireEvent.change(taskForm.getByLabelText("Project"), { target: { value: projectId } });
    fireEvent.click(taskForm.getByRole("button", { name: "Create task" }));
    fireEvent.click(screen.getByRole("button", { name: "Review project: Demo release" }));
    const review = within(screen.getByRole("dialog"));
    fireEvent.change(review.getByLabelText("Project status"), { target: { value: "pending_approval" } });
    fireEvent.change(review.getByLabelText("Review comment"), { target: { value: "Clarify the launch checklist." } });
    fireEvent.click(review.getByRole("button", { name: "Request revision" }));
    cleanup();

    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "Review project: Demo release" }));
    const savedReview = within(screen.getByRole("dialog"));
    expect(savedReview.getByLabelText("Project status")).toHaveValue("need_revision");
    expect(savedReview.getByLabelText("Review comment")).toHaveValue("Clarify the launch checklist.");
    fireEvent.change(savedReview.getByLabelText("Review comment"), { target: { value: "Ready for release." } });
    fireEvent.click(savedReview.getByRole("button", { name: "Approve project" }));
    cleanup();

    openDemo();
    expect(screen.getByLabelText("Status for Prepare release notes")).toHaveValue("Approved");
    fireEvent.click(screen.getByRole("button", { name: "Review project: Demo release" }));
    const approved = within(screen.getByRole("dialog"));
    expect(approved.getByLabelText("Project status")).toHaveValue("complete");
    expect(approved.getByLabelText("Review comment")).toHaveValue("Ready for release.");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps demo messages across navigation and clears them through the global reset", () => {
    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "Communication" }));
    fireEvent.click(screen.getByRole("button", { name: "Messages" }));
    fireEvent.change(screen.getByLabelText("Your demo message"), { target: { value: "The sample handoff is ready." } });
    fireEvent.click(screen.getByRole("button", { name: "Add demo message" }));
    expect(within(screen.getByRole("log")).getByText("The sample handoff is ready.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Project Manager" }));
    expect(screen.getByRole("heading", { name: "Project Manager Dashboard" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Messages" }));
    expect(within(screen.getByRole("log")).getByText("The sample handoff is ready.")).toBeInTheDocument();
    cleanup();

    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "Communication" }));
    fireEvent.click(screen.getByRole("button", { name: "Messages" }));
    expect(within(screen.getByRole("log")).getByText("The sample handoff is ready.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset demo" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reset demo" }));
    expect(localStorage.getItem("bells-demo-panels-v1")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Messages" }));
    expect(within(screen.getByRole("log")).queryByText("The sample handoff is ready.")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("bells-demo-panels-v1")!).messages).toHaveLength(2);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("switches to a contributor view containing only the guest's assigned tasks", async () => {
    openDemo();
    expect(screen.getByRole("button", { name: "Open task: Design the homepage" })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "Switch demo role" }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Contributor" }));
    expect(screen.getByRole("heading", { name: "My Tasks" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Open task:/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Open task: Build the onboarding checklist" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open task: Design the homepage" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open task: Review the welcome message" })).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("Status for Build the onboarding checklist")).queryByRole("option", { name: "Approved" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New task" }));
    const assignee = within(screen.getByRole("dialog")).getByLabelText("Assign to");
    expect(within(assignee).getAllByRole("option")).toHaveLength(1);
    expect(assignee).toHaveValue("you");
    expect(fetch).not.toHaveBeenCalled();
  });
});
