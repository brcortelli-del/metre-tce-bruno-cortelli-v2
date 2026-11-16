import fs from "node:fs/promises";
import ExcelJS from "exceljs";
await fs.mkdir("public/examples", { recursive: true });
const csv =
  "Famille;Type;Niveau;Désignation;Longueur [m];Surface [m2];Volume [m3];Nombre\r\nMurs;Mur béton 20;RDC;Mur extérieur nord;10;25;5;1\r\nMurs;Mur béton 20;RDC;Mur extérieur sud;8;20;4;1\r\nPortes;Porte intérieure;RDC;Porte séjour;;;;2\r\n";
await fs.writeFile("public/examples/revit.csv", "\ufeff" + csv);
const wb = new ExcelJS.Workbook(),
  sheet = wb.addWorksheet("Nomenclature Revit");
sheet.addRow([
  "Famille",
  "Type",
  "Niveau",
  "Désignation",
  "Longueur [m]",
  "Surface [m2]",
  "Volume [m3]",
  "Nombre",
]);
sheet.addRow([
  "Murs",
  "Mur béton 20",
  "RDC",
  "Mur extérieur nord",
  10,
  25,
  5,
  1,
]);
sheet.addRow(["Murs", "Mur béton 20", "RDC", "Mur extérieur sud", 8, 20, 4, 1]);
sheet.addRow([
  "Portes",
  "Porte intérieure",
  "RDC",
  "Porte séjour",
  "",
  "",
  "",
  2,
]);
sheet.getRow(1).font = { bold: true };
sheet.columns.forEach((c) => (c.width = 24));
await wb.xlsx.writeFile("public/examples/revit.xlsx");
const pairs = [
  [0, "SECTION"],
  [2, "HEADER"],
  [9, "$INSUNITS"],
  [70, 6],
  [0, "ENDSEC"],
  [0, "SECTION"],
  [2, "ENTITIES"],
  [0, "LWPOLYLINE"],
  [5, "A1"],
  [100, "AcDbEntity"],
  [8, "TERRASSEMENT"],
  [100, "AcDbPolyline"],
  [90, 4],
  [70, 1],
  [10, 0],
  [20, 0],
  [10, 10],
  [20, 0],
  [10, 10],
  [20, 8],
  [10, 0],
  [20, 8],
  [0, "LINE"],
  [5, "A2"],
  [8, "MUR_EXT_20"],
  [10, 0],
  [20, 0],
  [30, 0],
  [11, 10],
  [21, 0],
  [31, 0],
  [0, "INSERT"],
  [5, "A3"],
  [8, "PORTES"],
  [2, "PORTE_90"],
  [10, 2],
  [20, 0],
  [0, "ENDSEC"],
  [0, "EOF"],
];
await fs.writeFile(
  "public/examples/autocad.dxf",
  pairs.map(([a, b]) => a + "\n" + b + "\n").join(""),
);
const gid = (n) => String(n).padStart(22, "0");
const ifc = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Témoin de quantités, sans géométrie'),'2;1');
FILE_NAME('mur-qto.ifc','2026-11-13T12:00:00',('Atelier Métré'),('Formation'),'Atelier','Atelier','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCSIUNIT(*,.LENGTHUNIT.,$,.METRE.);
#2=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);
#3=IFCSIUNIT(*,.VOLUMEUNIT.,$,.CUBIC_METRE.);
#4=IFCUNITASSIGNMENT((#1,#2,#3));
#5=IFCPROJECT('${gid(5)}',$,'Projet témoin',$,$,$,$,$,#4);
#6=IFCSITE('${gid(6)}',$,'Site',$,$,$,$,$,.ELEMENT.,$,$,$,$,$);
#7=IFCBUILDING('${gid(7)}',$,'Bâtiment A',$,$,$,$,$,.ELEMENT.,$,$,$);
#8=IFCBUILDINGSTOREY('${gid(8)}',$,'RDC',$,$,$,$,$,.ELEMENT.,0.);
#9=IFCWALL('${gid(9)}',$,'Mur extérieur nord',$,$,$,$,$,.NOTDEFINED.);
#10=IFCRELAGGREGATES('${gid(10)}',$,$,$,#5,(#6));
#11=IFCRELAGGREGATES('${gid(11)}',$,$,$,#6,(#7));
#12=IFCRELAGGREGATES('${gid(12)}',$,$,$,#7,(#8));
#13=IFCRELCONTAINEDINSPATIALSTRUCTURE('${gid(13)}',$,$,$,(#9),#8);
#14=IFCQUANTITYLENGTH('Length',$,$,10.,$);
#15=IFCQUANTITYAREA('NetSideArea',$,$,25.,$);
#16=IFCQUANTITYVOLUME('NetVolume',$,$,5.,$);
#17=IFCELEMENTQUANTITY('${gid(17)}',$,'Qto_WallBaseQuantities',$,'Quantités nettes exportées',(#14,#15,#16));
#18=IFCRELDEFINESBYPROPERTIES('${gid(18)}',$,$,$,(#9),#17);
#19=IFCWALLTYPE('${gid(19)}',$,'Mur béton 20',$,$,$,$,$,$,.NOTDEFINED.);
#20=IFCRELDEFINESBYTYPE('${gid(20)}',$,$,$,(#9),#19);
ENDSEC;
END-ISO-10303-21;
`;
await fs.writeFile("public/examples/mur-qto.ifc", ifc);
