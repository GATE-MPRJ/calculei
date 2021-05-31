import { Component, OnInit, ViewChild, ElementRef, Injectable } from '@angular/core';
import { CalcService } from '../services/calc.service'
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormControl,
  FormArray,
  FormControlName,
} from "@angular/forms";
import { MatTableDataSource } from "@angular/material/table";
import { DatePipe, UpperCasePipe } from '@angular/common';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas"

import { retry, catchError, tap, map, retryWhen, filter, mergeMap } from 'rxjs/operators';


const pdfMakeX = require('pdfmake/build/pdfmake.js');
const pdfFontsX = require('pdfmake-unicode/dist/pdfmake-unicode.js');
pdfMakeX.vfs = pdfFontsX.pdfMake.vfs;
import * as pdfMake from 'pdfmake/build/pdfmake';
const dateFormat = require('dateformat');
const moment = require('moment');
var htmlToPdfmake = require("html-to-pdfmake");
// const jsdom = require("jsdom");
// const { JSDOM } = jsdom;
// var { window } = new JSDOM("")
// import pdfFonts from 'pdfmake/build/vfs_fonts';


//import htmlToPdfmake from "html-to-pdfmake";


import { responseIndice } from '../model/responseIndice.model'
import { Observable } from 'rxjs';
import { validateHorizontalPosition } from '@angular/cdk/overlay';
import { IfStmt } from '@angular/compiler';
import { style } from '@angular/animations';

@Injectable()
@Component({
  selector: 'app-calc',
  templateUrl: './calc.component.html',
  styleUrls: ['./calc.component.scss']
})



export class CalcComponent implements OnInit {
   // @ViewChild('pdfTable') pdfTable!: ElementRef;
  // @ViewChild('htmlData') htmlData!: ElementRef;

  constructor(public service: CalcService) { }
  //  public users: User[] = [];
  //@ViewChild(ChildDirective) child!: ChildDirective;

  public formCalc = new FormGroup({
    //Lançmentos
    fcLancametos: new FormControl(""),
    fcDtIniLanca: new FormControl(""),
    fcDtFimLanca: new FormControl(""),
    fcValorLanca: new FormControl(""),
    fcIndiceLanca: new FormControl(""),
    FcJuros: new FormControl(""),
    fcTipos: new FormControl(""),
    // Juros
    fcDtIniJuros: new FormControl(""),
    fcDtFimJuros: new FormControl(""),
    fcValorJuros: new FormControl(""),
    fcIndiceJuros: new FormControl(""),
    fcPeriodoJuros: new FormControl(""),


  })
  // @ViewChild('htmlData') htmlData:ElementRef;

  dados: any = [];

  isActive = false;


  //datahoje = dateFormat(Date.now(), "dddd  mmm  yyyy, hh:MM:ss");

  datahoje = dateFormat(Date.now(), "dddd  mmm  yyyy, hh:MM:ss");

  firstFormGroup: FormGroup = this.formCalc;
  dataTableJuros = [];
  dataSourceJuros = new MatTableDataSource<Element>(this.dataTableJuros);
  displayedColumns = [
    "select",
    "position",
    "delete",
    "dtIni",
    "dtFim",
    "indice",
    "dias",
    "valor",
    "check",
  ];
  // 
  public ResponseIndice: responseIndice[] = [];
  //public ResponseIndice: Observable<responseIndice>;
  //ResponseIndice = [];
  SumTotal = 0;
  public SumTotalCorr = 0;
  dataTableLanca = [];

  dataTableRelatorio: any = [];

  dataSourceLanca = new MatTableDataSource<ElementLanc>(this.dataTableLanca);
  displayedColumnsLanc = [
    "select",
    "position",
    "delete",
    "dtIni",
    "dtFim",
    "indice",
    "dias",
    "valor",
    "juros",
    "valorCorr",
    "check",
  ];

  displayedColumnsF = ['indice', 'valor'];


  ngOnInit(): void {
    console.log("OOOO", this.dataSourceJuros.data.length)
    console.log("OOOO", this.dataSourceLanca.data.length)
  }

  // Função para Converter ano em ano 360 dias
  days360(dateA: any, dateB: any) {

    dateA = new Date(dateA);
    dateB = new Date(dateB);

    var dayA = dateA.getDate();
    var dayB = dateB.getDate();

    if (this.lastDayOfFebruary(dateA) && this.lastDayOfFebruary(dateB))
      dayB = 30;

    if (dayA == 31 && this.lastDayOfFebruary(dateA))
      dayA = 30;

    if (dayA == 30 && dayB == 31)
      dayB = 30;

    if (dayA == 31) {
      dayA = 30;
    }
    if (dayB == 31) {
      dayB = 30;
    }

    var days = ((dateB.getFullYear() - dateA.getFullYear()) * 360) + (((dateB.getMonth() + 1) - (dateA.getMonth() + 1)) * 30) + (dayB - dayA);
    return days;
  }

  lastDayOfFebruary(date: any) {

    var lastDay = new Date(date.getFullYear(), 2, 1);
    console.log("Last Dau", lastDay)
    return date.getDate() == lastDay;
  }



  public addTbl() {

    console.log(this.formCalc.controls.fcTipos);
    const INDICES = this.formCalc.get("fcIndiceLanca")?.value;
    moment.locale('pt-BR');
    const dat = responseIndice;

    let data_ini = ""
    let data_fim = ""

    let dt1 = (this.formCalc.get("fcDtIniLanca")?.value);
    let dt2 = (this.formCalc.get("fcDtFimLanca")?.value);

    data_ini = moment(dt1).format('DD-MM-YYYY');
    data_fim = moment(dt2).format('DD-MM-YYYY');



    this.service.getIndice(INDICES, data_ini?.toString(), data_fim?.toString()).subscribe((res: any) => {
      this.ResponseIndice = res.content
      console.log(this.ResponseIndice)
    })

    if (this.ResponseIndice.length > 0) {

      if (this.formCalc.get("fcIndiceLanca")?.value === "TJ899" || this.formCalc.get("fcIndiceLanca")?.value === "TJ11960") {
        console.log("IF ===", INDICES)
        this.setCalcTj(this.ResponseIndice)
        //this.setCalc(this.ResponseIndice);
      } else {
        console.log("IF !==", INDICES)
        //this.setCalcTj(this.ResponseIndice)
        this.setCalc(this.ResponseIndice);
      }


    }

  }
  // Acertar esse para fazer os calculos usando dados do TJ
  setCalcTj(data: any) {
    console.log("TJ XXX", data)

    let maior = 0
    let dtIni = "";
    let dtFim = "";
    let Juros = 0
    let days2003 = 0
    let fator = 0;
    let dtIni2: Date;
    let data_ini = ""
    let data_fim = ""

    let dt1 = (this.formCalc.get("fcDtIniLanca")?.value);
    let dt2 = (this.formCalc.get("fcDtFimLanca")?.value);

    data_ini = moment(dt1).format('YYYY-MM-DD 00:00:00.0');
    data_fim = moment(dt2).format('YYYY-MM-DD 00:00:00.0');

    // Função para calcular calcular juros anteriores e posteriores a 2003

    if (this.formCalc.get("FcJuros")?.value == true) {
      if (dtIni < "2003-01-10") {
        let dd = (((0.06) / 360) * this.days360(dtIni, "2003-01-10"));
        Juros = (dd) * this.formCalc.get("fcValorLanca")?.value
      }

      if (dtIni > "2003-01-10") {
        let dd = (((0.12) / 360) * this.days360(dtIni, dtFim));
        Juros = (dd) * this.formCalc.get("fcValorLanca")?.value
      }
    }

    let day = this.days360(data_ini, data_fim);
    let respIndice;

    let total = 0;
    let total2 = 0;

    // P
    data.map((x: any) => {
      total = total + x.valor;
      //dtIni = dtIni + " 00:00:00.0"
      console.log("dtIni", data_ini)
      console.log("xdata", x.data)
      if (x.data === data_ini) {
        maior = x.acumulado;
        respIndice = x.nome;
        fator = x.fator;
        console.log("fator", x.fator)
      }

    })

    this.dados.push({
      dtIni: dtIni,
      dtFim: dtFim,
      indice: respIndice,
      dias: day,
      valor: this.formCalc.get("fcValorLanca")?.value,
      juros: Juros,
      valorCorr: (fator * this.formCalc.get("fcValorLanca")?.value) //+ Juros
    });

    this.SumTotal = 0;
    this.SumTotalCorr = 0;
    console.log("Dados", this.dados)
    this.dataTableLanca = this.dados
    this.dataTableLanca.map((x: any) => {

      this.SumTotal = this.SumTotal + x.valor
      this.SumTotalCorr = this.SumTotalCorr + x.valorCorr
    });

    this.dataSourceLanca = new MatTableDataSource<ElementLanc>(this.dataTableLanca)


  }

  setCalc(data: any) {
    let maior = 0
    let dtIni = "";
    let dtFim = "";
    let Juros = 0
    let days2003 = 0

    dtIni = this.formCalc.get("fcDtIniLanca")?.value;
    dtFim = this.formCalc.get("fcDtFimLanca")?.value;

    // Função para calcular calcular juros anteriores e posteriores a 2003
    if (this.formCalc.get("FcJuros")?.value == true) {
      if (dtIni < "2003-01-10") {
        let dd = (((0.06) / 360) * this.days360(dtIni, "2003-01-10"));
        Juros = (dd) * this.formCalc.get("fcValorLanca")?.value
      }

      if (dtIni > "2003-01-10") {
        let dd = (((0.12) / 360) * this.days360(dtIni, dtFim));
        Juros = (dd) * this.formCalc.get("fcValorLanca")?.value
      }
    }
    let day = this.days360(dtIni, dtFim);
    let respIndice;

    let total = 0;
    let total2 = 0;


    data.map((x: any) => {
      total = total + x.valor;
      if (x.acumulado > maior) {
        maior = x.acumulado;
        respIndice = x.nome;

      }

    })
    this.ResponseIndice.map((x: any) => {
      this.dataTableRelatorio.push({
        indice: x.nome,
        data: x.data,
        fato: x.fato,
        valor: x.valor,
        acumulado: x.acumulado,
        result: x.acumulado * this.formCalc.get("fcValorLanca")?.value
      })
    })
    console.log('DAta REL', this.dataTableRelatorio)

    this.dados.push({
      dtIni: dtIni,
      dtFim: dtFim,
      indice: respIndice,
      dias: day,
      valor: this.formCalc.get("fcValorLanca")?.value,
      juros: Juros,
      valorCorr: (maior * this.formCalc.get("fcValorLanca")?.value) + Juros,
      correcao: ((maior * this.formCalc.get("fcValorLanca")?.value) + Juros) - (this.formCalc.get("fcValorLanca")?.value)
    });

    this.SumTotal = 0;
    this.SumTotalCorr = 0;

    this.dataTableLanca = this.dados
    this.dataTableLanca.map((x: any) => {
      this.SumTotal = this.SumTotal + x.valor
      this.SumTotalCorr = this.SumTotalCorr + x.valorCorr
    });

    this.dataSourceLanca = new MatTableDataSource<ElementLanc>(this.dataTableLanca)

  }
    
  public downloadAsPDF() {

    const data2 = document.getElementById('pdfTable') as HTMLElement;
    // var win = window.open('', '_blank');

    var html = htmlToPdfmake(data2.innerHTML );
    
    const documentDefinition = {content: html}
    
    // Abri o 
    // pdfMake.createPdf(documentDefinition).print({}, win); 

    pdfMake.createPdf(documentDefinition).open();


  }
  public makePDF() {

    var quotes = document.getElementById('pdfTable') as HTMLElement;

    html2canvas(quotes).then(canvas => {
        

        //! MAKE YOUR PDF
        var pdf = new jsPDF('p', 'pt', 'letter');

        for (var i = 0; i <= quotes.clientHeight/980; i++) {
            //! This is all just html2canvas stuff
            var srcImg  = canvas;
            var sX      = 0;
            var sY      = 980*i; // start 980 pixels down for every new page
            var sWidth  = 900;
            var sHeight = 980;
            var dX      = 0;
            var dY      = 0;
            var dWidth  = 900;
            var dHeight = 980;

            //window.'' = document.createElement("canvas");
            canvas.setAttribute('width', '900');
            canvas.setAttribute('height', '980');
            var ctx = canvas.getContext('2d');
            // details on this usage of this function: 
            // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Using_images#Slicing
            //ctx.drawImage(srcImg,sX,sY,sWidth,sHeight,dX,dY,dWidth,dHeight);

            // document.body.appendChild(canvas);
            var canvasDataURL = canvas.toDataURL("image/png", 1.0);

            var width         = canvas.width;
            var height        = canvas.clientHeight;

            //! If we're on anything other than the first page,
            // add another page
            
            //! now we declare that we're working on that page
            //pdf.setPage(i+1);
            //! now we add content to that page!
            pdf.addImage(canvasDataURL, 'PNG', 20, 40, (width*.62), (height*.62));

        }
        //! after the for loop is finished running, we save the pdf.
        pdf.save('test.pdf');
    });
  
}

}
export interface Element {
  dtIni: Date;
  position: number;
  dtFim: Date;
  indice: string;
  dias: number;
  valor: number
}
export interface ElementLanc {
  dtIni: Date;
  position: number;
  dtFim: Date;
  indice: string;
  dias: number;
  valor: number

}

/*

function makePDF () {
  var doc = new jsPDF('p', 'pt', 'a4');
      var specialElementHandlers = {

      };
doc.fromHTML(document.getElementById('content'), 15, 15, {
          'width': 250,
          'margin': 1,
          'pagesplit': true,
          'elementHandlers': specialElementHandlers
        });

        doc.save('sample-file.pdf');
}
function makeMultiPage() {

        var quotes = document.getElementById('content');

        html2canvas(quotes, {
            onrendered: function(canvas) {

            //! MAKE YOUR PDF
            var pdf = new jsPDF('p', 'pt', 'letter');

            for (var i = 0; i <= quotes.clientHeight/980; i++) {
                //! This is all just html2canvas stuff
                var srcImg  = canvas;
                var sX      = 0;
                var sY      = 980*i; // start 980 pixels down for every new page
                var sWidth  = 900;
                var sHeight = 980;
                var dX      = 0;
                var dY      = 0;
                var dWidth  = 900;
                var dHeight = 980;

                window.onePageCanvas = document.createElement("canvas");
                onePageCanvas.setAttribute('width', 900);
                onePageCanvas.setAttribute('height', 980);
                var ctx = onePageCanvas.getContext('2d');
                // details on this usage of this function: 
                // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Using_images#Slicing
                ctx.drawImage(srcImg,sX,sY,sWidth,sHeight,dX,dY,dWidth,dHeight);

                // document.body.appendChild(canvas);
                var canvasDataURL = onePageCanvas.toDataURL("image/png", 1.0);

                var width         = onePageCanvas.width;
                var height        = onePageCanvas.clientHeight;

                //! If we're on anything other than the first page,
                // add another page
                if (i > 0) {
                    pdf.addPage(612, 791); //8.5" x 11" in pts (in*72)
                }
                //! now we declare that we're working on that page
                pdf.setPage(i+1);
                //! now we add content to that page!
                pdf.addImage(canvasDataURL, 'PNG', 20, 40, (width*.62), (height*.62));

            }
            //! after the for loop is finished running, we save the pdf.
            pdf.save('Test.pdf');
        }
      });
    }

*/