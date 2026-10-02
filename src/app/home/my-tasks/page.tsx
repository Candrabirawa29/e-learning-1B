import { redirect } from "next/navigation";

export default function MyTasksPage() {
  redirect("/home/tasks?scope=mine");
}
