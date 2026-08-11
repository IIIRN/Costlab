import { notFound } from "next/navigation";
import { BillDetailClient } from "@/components/dashboards/BillDetailClient";
import { TABLES } from "@/lib/config";
import { hydrateBillRows, hydrateContractRows } from "@/lib/formulas";
import { getRows } from "@/lib/sheets";
import type { SheetRow } from "@/lib/types";

export const dynamic = "force-dynamic";

type BillDetailPageProps = {
  params: Promise<{ billId: string }>;
};

export default async function BillDetailPage({ params }: BillDetailPageProps) {
  const { billId } = await params;
  const decodedBillId = decodeURIComponent(billId).trim();
  const [rawDataRows, projectRows, rawContractRows, peopleRows, storeRows, contractorRows] = await Promise.all([
    getRows(TABLES.DATA).catch(() => []),
    getRows(TABLES.PROJECT).catch(() => []),
    getRows(TABLES.CONTRACT_WORK).catch(() => []),
    getRows(TABLES.PEOPLE).catch(() => []),
    getRows(TABLES.STORE).catch(() => []),
    getRows(TABLES.CONTRACTOR).catch(() => []),
  ]);

  const dataRows = await hydrateBillRows(rawDataRows);
  const contractRows = await hydrateContractRows(rawContractRows);
  const bill = dataRows.find((row) => billKey(row) === decodedBillId || String(row._sheetRow || "") === decodedBillId);
  if (!bill) notFound();

  const projectId = text(bill["ID Project"]);
  const contractId = text(bill["ผู้รับเหมา"]);
  const project = projectRows.filter((row) => text(row["ID Project"]) === projectId);
  const contract = contractId ? contractRows.filter((row) => text(row.id_Conwork) === contractId) : [];

  // Resolve Requester Name & Link
  const rawRequester = text(bill["ผู้เบิก"]);
  const matchedPerson = rawRequester
    ? peopleRows.find((p) => {
        const code = text(p["รหัสพนักงาน"] || p.id).toLowerCase();
        const nickname = text(p["ชื่อเล่น"]).toLowerCase();
        const fullName = text(p["ชื่อ-นามสกุล"]).toLowerCase();
        const reqLower = rawRequester.toLowerCase();
        return code === reqLower || nickname === reqLower || fullName === reqLower;
      })
    : null;

  const personName = matchedPerson ? text(matchedPerson["ชื่อเล่น"] || matchedPerson["ชื่อ-นามสกุล"]) : "";
  const requesterDisplay = rawRequester
    ? personName && !rawRequester.toLowerCase().includes(personName.toLowerCase())
      ? `${rawRequester} - ${personName}`
      : rawRequester
    : "-";

  const requesterSearchQuery = matchedPerson
    ? text(matchedPerson["รหัสพนักงาน"] || matchedPerson["ชื่อเล่น"] || rawRequester)
    : rawRequester;
  const requesterLink = rawRequester ? `/views/people?search=${encodeURIComponent(requesterSearchQuery)}` : "";

  // Resolve Vendor / Store / Contractor Name & Link
  const rawVendor = text(bill["ร้านค้า"] || bill["ผู้รับเหมา"] || bill["ร้านค้า/ผู้รับเหมา"] || bill["ร้าน/บุคคล"]);
  const isContractorMatched = rawVendor
    ? contractorRows.some((c) => {
        const code = text(c["id_Contractor"] || c.id).toLowerCase();
        const nickname = text(c["ชื่อเล่น"]).toLowerCase();
        const fullName = text(c["ชื่อ-นามสกุล"]).toLowerCase();
        const vLower = rawVendor.toLowerCase();
        return code === vLower || nickname === vLower || fullName === vLower || vLower.includes(nickname);
      })
    : false;

  const vendorDisplay = rawVendor || "-";
  const vendorLink = rawVendor
    ? isContractorMatched
      ? `/views/contractors?search=${encodeURIComponent(rawVendor)}`
      : `/views/stores?search=${encodeURIComponent(rawVendor)}`
    : "";

  return (
    <BillDetailClient
      bill={bill}
      decodedBillId={decodedBillId}
      project={project}
      contract={contract}
      requesterDisplay={requesterDisplay}
      requesterLink={requesterLink}
      vendorDisplay={vendorDisplay}
      vendorLink={vendorLink}
    />
  );
}

function text(value: unknown) {
  return String(value || "").trim();
}

function billKey(row: SheetRow) {
  return text(row["ลำดับ"]) || text(row._sheetRow);
}
