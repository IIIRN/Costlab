const UPLOAD_TOKEN = "12345678"; // แก้ไขให้ตรงกับ GOOGLE_DRIVE_UPLOAD_TOKEN ในไฟล์ .env.local ของคุณ

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    if (UPLOAD_TOKEN && payload.token !== UPLOAD_TOKEN) {
      return json({ error: "Invalid upload token" }, 403);
    }

    const folder = DriveApp.getFolderById(payload.folderId);
    
    // สร้างเอกสาร PDF จาก Google Doc Template
    if (payload.action === "createPdfFromTemplate") {
      const templateId = payload.templateId || "1Wrj98tw6PcCxnuYQNY_YHEv-b85fMRD1VGCh7xJfySk";
      const templateFile = DriveApp.getFileById(templateId);
      
      // แยกโฟลเดอร์ตามประเภท และเดือน (เช่น บริษัท เดือน 3 ยื่นภาษี หรือ บุคคลธรรมดา เดือน 2 ยื่นภาษี)
      let targetFolder = folder;
      if (payload.subFolder) {
        const subFolderIterator = folder.getFoldersByName(payload.subFolder);
        if (subFolderIterator.hasNext()) {
          targetFolder = subFolderIterator.next();
        } else {
          targetFolder = folder.createFolder(payload.subFolder);
        }
      }
      
      // สร้างสำเนาของ Google Doc Template เข้าไปในโฟลเดอร์ปลายทางที่แยกไว้
      const tempDocName = (payload.fileName || "bill.pdf").replace(/\.pdf$/i, "") + "_temp";
      const tempDocFile = templateFile.makeCopy(tempDocName, targetFolder);
      const doc = DocumentApp.openById(tempDocFile.getId());
      const body = doc.getBody();
      
      // ดำเนินการแทนที่ Placeholder ด้วยข้อมูลจริง
      const replacements = payload.replacements || {};
      for (const [key, value] of Object.entries(replacements)) {
        // ค้นหาคำรูปแบบ <<[key]>> ในเทมเพลตและแทนที่
        const searchPattern = "<<\\[" + escapeRegExp(key) + "\\]>>";
        body.replaceText(searchPattern, String(value || ""));
      }
      
      doc.saveAndClose();
      
      // แปลงเอกสารสำเนาที่แก้ไขแล้วเป็น PDF และบันทึกในโฟลเดอร์เดียวกัน
      const pdfBlob = tempDocFile.getAs(MimeType.PDF).setName(payload.fileName || "bill.pdf");
      const pdfFile = targetFolder.createFile(pdfBlob);
      
      // ลบเอกสารสำเนาชั่วคราว (Google Doc) ทิ้งไป เพื่อให้เหลือเฉพาะ PDF
      tempDocFile.setTrashed(true);
      
      return json({
        id: pdfFile.getId(),
        name: pdfFile.getName(),
        url: pdfFile.getUrl()
      });
    }

    // สร้างเอกสาร PDF จาก HTML (แบบเก่า - เพื่อให้ระบบยังรองรับฟังก์ชันเก่าๆ ได้)
    if (payload.action === "createPdf") {
      const sourceName = String(payload.fileName || "bill.pdf").replace(/\.pdf$/i, ".html");
      const htmlBlob = Utilities.newBlob(payload.html || "", "text/html", sourceName);
      const pdfBlob = htmlBlob.getAs(MimeType.PDF).setName(payload.fileName || "bill.pdf");
      const pdfFile = folder.createFile(pdfBlob);

      return json({
        id: pdfFile.getId(),
        name: pdfFile.getName(),
        url: pdfFile.getUrl()
      });
    }

    // อัปโหลดไฟล์รูปถ่ายบิลทั่วไป
    const bytes = Utilities.base64Decode(payload.data);
    const blob = Utilities.newBlob(bytes, payload.mimeType || "application/octet-stream", payload.fileName || "bill-upload");
    const file = folder.createFile(blob);

    return json({
      id: file.getId(),
      name: file.getName(),
      url: file.getUrl()
    });
  } catch (error) {
    return json({ error: error && error.message ? error.message : String(error) }, 400);
  }
}

// ฟังก์ชันช่วยสำหรับการแปลงอักขระพิเศษสำหรับ Regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function json(body, statusCode) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
