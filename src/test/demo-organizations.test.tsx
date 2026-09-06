import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DemoRoutes from "../pages/DemoRoutes";

const originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");

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
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});

afterEach(() => {
  expect(fetch).not.toHaveBeenCalled();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalScrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
  else delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
});

function openDemo(path = "/demo") {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/demo/*" element={<DemoRoutes />} /></Routes></MemoryRouter>);
}

function savedOrganizations() {
  return JSON.parse(localStorage.getItem("bells-demo-organizations-v1")!) as {
    activeId: string | null;
    organizations: { id: string; name: string; role: string; department: string | null; isSample: boolean }[];
  };
}

async function chooseOption(label: string, option: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("option", { name: option }));
}

async function createManagerOrganization(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Create Organization" }));
  const form = within(await screen.findByRole("dialog", { name: "Create New Organization" }));
  fireEvent.change(form.getByLabelText("Organization Name"), { target: { value: name } });
  expect(form.getByRole("combobox", { name: "Your Role" })).toHaveTextContent("Project Manager");
  fireEvent.click(form.getByRole("button", { name: "Create" }));
  await screen.findByRole("button", { name: `Enter ${name}` });
  return savedOrganizations().organizations.find(organization => organization.name === name)!;
}

async function enterOrganization(name: string, heading = "Project Manager Dashboard") {
  fireEvent.click(screen.getByRole("button", { name: `Enter ${name}` }));
  await screen.findByRole("heading", { name: heading });
}

async function switchOrganization(name: string) {
  fireEvent.click(screen.getByRole("button", { name: `Switch organization: ${name}` }));
  await screen.findByRole("heading", { name: "Your Organizations" });
}

function openMessages() {
  fireEvent.click(screen.getByRole("button", { name: "Communication" }));
  fireEvent.click(screen.getByRole("button", { name: "Messages" }));
}

describe("Bells demo organizations", () => {
  it("starts at the organization portal and redirects workspace deep links without a selection", async () => {
    openDemo();
    expect(await screen.findByRole("heading", { name: "Your Organizations" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Organization" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Project Manager Dashboard" })).not.toBeInTheDocument();
    cleanup();

    openDemo("/demo/workspace");
    expect(await screen.findByRole("heading", { name: "Your Organizations" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Project Manager Dashboard" })).not.toBeInTheDocument();
    expect(localStorage.getItem("bells-demo-v1")).toBeNull();
  });

  it("creates a manager organization without entering it, then opens and restores its blank workspace", async () => {
    openDemo();
    const organization = await createManagerOrganization("Research Hub");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your Organizations" })).toBeInTheDocument();
    expect(savedOrganizations().activeId).toBeNull();
    expect(organization).toMatchObject({ role: "project_lead", department: null, isSample: false });

    await enterOrganization("Research Hub");
    expect(screen.getByRole("button", { name: "Switch organization: Research Hub" })).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /^Open task:/ })).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: /^Review project:/ })).toHaveLength(0);
    expect(screen.getByRole("button", { name: "New task" })).toBeDisabled();
    expect(JSON.parse(localStorage.getItem(`bells-demo-workspace-${organization.id}`)!)).toMatchObject({ projects: [], tasks: [] });
    expect(localStorage.getItem("bells-demo-v1")).toBeNull();
    cleanup();

    openDemo("/demo/workspace");
    expect(await screen.findByRole("heading", { name: "Project Manager Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch organization: Research Hub" })).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /^Open task:/ })).toHaveLength(0);
    expect(savedOrganizations().activeId).toBe(organization.id);
  });

  it("keeps a custom organization's project, task, and messages isolated when switching to the sample and back", async () => {
    openDemo();
    const organization = await createManagerOrganization("Organization A");
    await enterOrganization("Organization A");
    fireEvent.click(screen.getByRole("button", { name: "New Project" }));
    const projectForm = within(screen.getByRole("dialog", { name: "Create Project" }));
    fireEvent.change(projectForm.getByLabelText("Project name"), { target: { value: "Org A milestone" } });
    expect(projectForm.getByLabelText("Project lead")).toHaveValue("you");
    fireEvent.click(projectForm.getByRole("button", { name: "Create Project" }));
    fireEvent.click(screen.getByRole("button", { name: "New task" }));
    const taskForm = within(screen.getByRole("dialog"));
    fireEvent.change(taskForm.getByLabelText("Task title"), { target: { value: "Org A handoff" } });
    fireEvent.click(taskForm.getByRole("button", { name: "Create task" }));
    expect(screen.getByRole("button", { name: "Open task: Org A handoff" })).toBeInTheDocument();
    openMessages();
    expect(within(screen.getByRole("log")).queryByText(/Welcome to our sample workspace/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Your demo message"), { target: { value: "Only Organization A should see this." } });
    fireEvent.click(screen.getByRole("button", { name: "Add demo message" }));
    expect(within(screen.getByRole("log")).getByText("Only Organization A should see this.")).toBeInTheDocument();

    await switchOrganization("Organization A");
    await enterOrganization("Bells Demo Organization");
    expect(screen.getAllByRole("button", { name: /^Open task:/ })).toHaveLength(5);
    expect(screen.getByLabelText("Status for Design the homepage")).toHaveValue("In progress");
    expect(screen.queryByRole("button", { name: "Open task: Org A handoff" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review project: Org A milestone" })).not.toBeInTheDocument();
    openMessages();
    expect(within(screen.getByRole("log")).getByText(/Welcome to our sample workspace/)).toBeInTheDocument();
    expect(within(screen.getByRole("log")).queryByText("Only Organization A should see this.")).not.toBeInTheDocument();
    await switchOrganization("Bells Demo Organization");
    await enterOrganization("Organization A");
    expect(screen.getAllByRole("button", { name: /^Open task:/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Review project: Org A milestone" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open task: Org A handoff" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open task: Design the homepage" })).not.toBeInTheDocument();
    openMessages();
    expect(within(screen.getByRole("log")).getByText("Only Organization A should see this.")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(`bells-demo-workspace-${organization.id}`)!).tasks).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(`bells-demo-panels-${organization.id}`)!).messages).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem("bells-demo-v1")!).tasks).toHaveLength(5);
    expect(JSON.parse(localStorage.getItem("bells-demo-panels-v1")!).messages).toHaveLength(2);
  });

  it.each([
    { role: "Team Lead", value: "team_lead", department: "Research", heading: "Team Lead Dashboard" },
    { role: "Contributor", value: "member", department: "Marketing", heading: "My Tasks" },
  ])("requires a department for $role and opens the selected role and department", async ({ role, value, department, heading }) => {
    openDemo();
    fireEvent.click(screen.getByRole("button", { name: "Create Organization" }));
    const name = `${department} workspace`;
    fireEvent.change(screen.getByLabelText("Organization Name"), { target: { value: name } });
    await chooseOption("Your Role", role);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create" }));
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("Please select a department.");
    expect(savedOrganizations().organizations).toHaveLength(1);
    await chooseOption("Department", department);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create" }));
    const entry = await screen.findByRole("button", { name: `Enter ${name}` });
    expect(entry).toHaveTextContent(`${role} · ${department.toLowerCase()}`);
    expect(savedOrganizations().organizations.find(organization => organization.name === name)).toMatchObject({ role: value, department: department.toLowerCase(), isSample: false });
    await enterOrganization(name, heading);
    expect(screen.queryByRole("heading", { name: "Project Manager Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Switch organization: ${name}` })).toBeInTheDocument();
    if (value === "team_lead") {
      expect(screen.getByText(`Viewing the ${department} department.`, { exact: false })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "New Project" }));
      const form = within(screen.getByRole("dialog"));
      const departmentSelect = form.getByLabelText("Department");
      expect(departmentSelect).toHaveValue(department.toLowerCase());
      expect(within(departmentSelect).getAllByRole("option")).toHaveLength(1);
      expect(form.getByLabelText("Project lead")).toHaveValue("you");
    } else {
      expect(screen.getByText("Viewing tasks assigned to You.", { exact: false })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "New Project" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "New task" })).toBeDisabled();
    }
  });
});
