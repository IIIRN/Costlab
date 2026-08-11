import { LoadingState } from "@/components/LoadingState";

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto flex items-center justify-center min-h-[60vh]">
      <LoadingState title="กำลังโหลดข้อมูล..." />
    </div>
  );
}
