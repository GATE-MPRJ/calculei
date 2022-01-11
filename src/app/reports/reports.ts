import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable'

const pdfMakeX = require('pdfmake/build/pdfmake.js');
const pdfFontsX = require('pdfmake-unicode/dist/pdfmake-unicode.js');
pdfMakeX.vfs = pdfFontsX.pdfMake.vfs;
import * as pdfMake from 'pdfmake/build/pdfmake';

let htmlToPdfmake = require("html-to-pdfmake");

const garamondFont = require('../../assets/fonts/Garamond-normal.js');

export class Reports {

  async getBase64ImageFromUrl(imageUrl :string) {
    var res = await fetch(imageUrl);
    var blob = await res.blob();
  
    return new Promise((resolve, reject) => {
      var reader  = new FileReader();
      reader.addEventListener("load", function () {
          return resolve(reader.result);
      }, false);
  
      reader.onerror = () => {
        return reject(this);
      };
      reader.readAsDataURL(blob);
    })
  }

  async makePDF(id: string, date: string, headerImg:string) {

    let imageData : any = await this.getBase64ImageFromUrl(headerImg);

    const pdf = new jsPDF();
 
    pdf.setFont("Garamond", "normal");
    pdf.setFontSize(12);
    pdf.text(date, 15, 40);

    pdf.setProperties({
      title: "Relatório de Cálculo"
    });
    pdf.addImage(imageData.toString(), 'JPEG', 15, 15, 180, 15);
    autoTable(pdf, { 
      html: '#'+id , 
      startY: 45 , 
      showFoot: 'lastPage' , 
      styles: {
        font: 'Garamond',
        halign: 'center'
      },
      headStyles: {
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontStyle: 'normal',
      },
      columnStyles: {
        2 : {
          halign: 'right'
        },
        4 : {
          halign: 'right'
        },
        8 : {
          halign: 'right'
        },
      }
    })
    
    /*
    doc.autoTable({
      head: headRows(),
      body: bodyRows(5),
      startY: doc.lastAutoTable.finalY + 14,
      theme: 'plain',
    })
    */

    //pdf.save('Relatório.pdf')
    //pdf.output('dataurlnewwindow');
    var blob = pdf.output("blob");
    window.open(URL.createObjectURL(blob));
  }
   
  async downloadAsPDF(id: string, date: string, headerImg:string) {

    let imageData : any = await this.getBase64ImageFromUrl(headerImg);
    const data = document.getElementById(id) as HTMLElement;
    let html = htmlToPdfmake(data.innerHTML);
    
    const dd = { 
      documentDefinition:[
        {
            pageOrientation: 'landscape',
            pageMargins: [ 10, 10, 10, 10 ],
            pageSize: 'A4',
        }
      ],
      content: [
        {
          image: imageData.toString(),
          width: 510,
          alignment: 'left'
        },
        {
          text: date,
          style: 'header',
          alignment: 'right'
        },
        html
      ],
    }

    // pdfMake.createPdf(documentDefinition).print({}, win); 
    pdfMake.createPdf(dd).open();


  }

  public printHtml(id:string) {

    if(id === undefined){
      return false;
    }
    let oPrint
    let oJan = null;
    let layout = '<title>MPRJ - CALCULEI</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.0/css/bootstrap.min.css"><style>@media print { body{ -webkit-print-color-adjust:exact !important; width:95vw; margin:auto;} div {display: block !important;} th, td {text-align: center;vertical-align: middle;} th {background-color: #4472c4 !important; color: #fff !important; font-weight: bold !important; } th {background-color: #4472c4 !important; color: #fff !important; font-weight: bold !important;}}</style>';
    oPrint = window.document.getElementById(id)!.innerHTML;

    oJan = window.open(id);

    if (typeof oJan !== 'undefined'){
      oJan!.document.write(layout);
      oJan!.document.write(oPrint);
      oJan!.focus();
      oJan!.window.print();
      //oJan!.document.close();
    }
    return false;
  }
      
}