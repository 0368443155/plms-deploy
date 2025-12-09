"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { TableEditor } from "../_components/table-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const TableIdPage = () => {
  const params = useParams();
  const router = useRouter();
  const tableId = params.tableId as Id<"tables">;
  const tableData = useQuery(api.tables.getById, { tableId });

  if (tableData === undefined) {
    return (
      <div className="h-full flex flex-col">
        <div className="md:max-w-7xl mx-auto p-6 w-full">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (tableData === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-muted-foreground">Không tìm thấy bảng</p>
        <Button
          variant="outline"
          onClick={() => router.push("/tables")}
          className="mt-4"
        >
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="md:max-w-7xl mx-auto p-6 w-full h-full">
        <TableEditor tableId={tableId} />
      </div>
    </div>
  );
};

export default TableIdPage;

