import { Save } from "lucide-react";
import Button from "../components/common/Button"; // change this path if needed

export default function StickySaveBar({ progress, saving }) {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-50 border-t border-ink-200 bg-white/90 backdrop-blur">

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">

        <div className="flex-1 max-w-sm">

          <div className="mb-2 flex justify-between">

            <span className="text-sm font-medium text-ink-700">
              Profile Setup
            </span>

            <span className="text-sm font-semibold text-brand-600">
              {progress}%
            </span>

          </div>

          <div className="h-2 rounded-full bg-ink-100">

            <div
              className="h-2 rounded-full bg-brand-600 transition-all"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>

        </div>

        <Button
          type="submit"
          icon={Save}
          loading={saving}
        >
          Save Changes
        </Button>

      </div>

    </div>
  );
}