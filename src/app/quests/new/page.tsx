"use client";

import { useRouter } from "next/navigation";
import { CreateQuestForm } from "@/components/CreateQuestForm";

export default function NewQuestPage() {
  const router = useRouter();

  return (
    <div className="py-8 max-w-lg mx-auto">
      <CreateQuestForm onSuccess={() => router.push("/quests")} />
    </div>
  );
}
