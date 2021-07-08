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

moment.locale('pt-BR');
//import htmlToPdfmake from "html-to-pdfmake";


import { responseIndice } from '../model/responseIndice.model'
import { Observable } from 'rxjs';
import { validateHorizontalPosition } from '@angular/cdk/overlay';
import { IfStmt } from '@angular/compiler';
import { style } from '@angular/animations';

export interface ElementLanc {
  dtIni: Date;
  position: number;
  dtFim: Date;
  indice: string;
  dias: number;
  principal: number;
  memoria: any;
}export interface ElementJuros {
  indice: number;
  taxa: string;
  taxaAcumulada: string;
  dtIni: Date;
  dtFim: Date;
  dias: number;
  valor: number
}
export interface ElementAbatimentos {
  data: Date;
  valor: number
}
export interface ElementMemoria {
  data: Date;
  fator: number;
  valor: number;
  acumulado: number;
  result: number;
  var: number
  vardc: number
}
@Injectable()
@Component({
  selector: 'app-calc',
  templateUrl: './calc.component.html',
  styleUrls: ['./calc.component.scss']
})



export class CalcComponent implements OnInit {
  // @ViewChild('pdfTable') pdfTable!: ElementRef;
  // @ViewChild('htmlData') htmlData!: ElementRef;
  //minDate: Date;
  maxDate: Date;

  constructor(public service: CalcService) { 
    const currentYear = new Date().getFullYear();
    //this.minDate = new Date(currentYear - 20, 0, 1);
    this.maxDate = new Date();
  }
  //  public users: User[] = [];
  //@ViewChild(ChildDirective) child!: ChildDirective;

  public formCalc = new FormGroup({
    //Lançamentos
    fcTipos: new FormControl(""),
    fcListaLancamento: new FormControl(""),
    fcDtIniLanca: new FormControl(""),
    fcDtFimLanca: new FormControl(""),
    fcValorLanca: new FormControl(""),
    fcIndiceLanca: new FormControl(""),
    //Juros
    fcJuros: new FormControl(""),
    fcDtIniJuros: new FormControl(""),
    fcDtFimJuros: new FormControl(""),
    fcValorJuros: new FormControl(""),
    fcIndiceJuros: new FormControl(""),
    fcTaxaJuros: new FormControl(""),
    //Abatimentos
    fcAbatimentos: new FormControl(""),
    fcDtAbatimento: new FormControl(""),
    fcValorAbatimento: new FormControl(""),
  })

  // @ViewChild('htmlData') htmlData:ElementRef;

  isActive = false;

  //datahoje = dateFormat(Date.now(), "dddd  mmm  yyyy, hh:MM:ss");
  pipe = new DatePipe('pt')
  //moment.locale('pt-BR');
  // myFormattedDate = moment(Date.now()).format()
  // console.log(this.pipe)

  dataHoje = dateFormat(Date.now(), "dddd  mmmm  yyyy, hh:MM:ss");

  firstFormGroup: FormGroup = this.formCalc;
  dados: any = [];
  dataSourceLanca = new MatTableDataSource<ElementLanc>(this.dados);
  dataTableRelatorio: any = [];
  dataTableJuros: any = [];
  dataSourceJuros = new MatTableDataSource<ElementJuros>(this.dataTableJuros);
  dataTableAbatimentos: any = [];
  dataSourceAbatimentos = new MatTableDataSource<ElementAbatimentos>(this.dataTableAbatimentos);

    // 
    public ResponseIndice: responseIndice[] = [];
    //public ResponseIndice: Observable<responseIndice>;
    //ResponseIndice = [];
    SumTotal = 0;
    public SumTotalCorr = 0;

    
  displayedColumns = [
    "select",
    "position",
    "delete",
    "dtIni",
    "dtFim",
    "indice",
    "dias",
    "principal",
    "check",
  ];
  displayedColumnsLanc = [
  //  "position",
    "dtIni",
    "principal",
    "dtFim",
    "indice",
    "valorAtualizado",
    "dias",
    "jurosValorTotal",
    "valorCorr",
    "delete",
  ];

  displayedColumnsF = ['indice', 'principal'];
  displayedColumnsJuros = ['dtIni', 'valor'];



  ngOnInit(): void {

  }

  ngAfterViewInit(): void {

  }

  lastDayOfFebruary(date: any) {
    var lastDay = new Date(date.getFullYear(), 2, 1);
    return date.getDate() == lastDay;
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

  public removeRow(index: number) {
    if(confirm("Deseja EXCLUIR o lançamento?")) {
      this.dataSourceLanca.data.splice(index, 1);
      this.dataSourceLanca._updateChangeSubscription();
      this.calcSumTotals();
    }
  }

  public calcSumTotals(){
    this.SumTotal = 0;
    this.SumTotalCorr = 0;
    this.dados.map((x: any) => {
      this.SumTotal = this.SumTotal + x.principal;
      this.SumTotalCorr = this.SumTotalCorr + x.valorCorr;
    });
  }

  public startJuros(){
    this.formCalc.controls.fcIndiceJuros.setValue('poupanca');
    this.formCalc.controls.fcIndiceJuros.setValue(this.formCalc.get("fcDtIniLanca")?.value);
    this.formCalc.controls.fcIndiceJuros.setValue(this.formCalc.get("fcDtFimLanca")?.value);

  }

  public setJuros(){
    let jurosIndice = (this.formCalc.get("fcIndiceJuros")?.value);
    let jurosTaxa = (this.formCalc.get("fcTaxaJuros")?.value);
    let jurosDtIni = (this.formCalc.get("fcDtIniJuros")?.value);
    let jutosDtFim = (this.formCalc.get("fcDtFimJuros")?.value);
    this.dataTableJuros.push({
      indice: jurosIndice,
      taxa: jurosTaxa,
      dtIni: jurosDtIni,
      dtFim: jutosDtFim
    });
    this.dataSourceJuros = new MatTableDataSource<ElementJuros>(this.dataTableJuros);
  }

  public setAbatimento(){
    let abatimentosData = (this.formCalc.get("fcDtAbatimento")?.value);
    let abatimentosValor = (this.formCalc.get("fcValorAbatimento")?.value);
    this.dataTableAbatimentos.push({
      data: abatimentosData,
      valor: abatimentosValor,
    });
    this.dataSourceAbatimentos = new MatTableDataSource<ElementAbatimentos>(this.dataTableAbatimentos);
  }

  public addTbl() {

    moment.locale('pt-BR');
    const dat = responseIndice;
    let data_ini: string;
    let data_fim: string;

    const INDICES = this.formCalc.get("fcIndiceLanca")?.value;
    let dt1 = (this.formCalc.get("fcDtIniLanca")?.value);
    let dt2 = (this.formCalc.get("fcDtFimLanca")?.value);
        
    data_ini = moment(dt1).format('DD-MM-YYYY');    
    data_fim = moment(dt2).format('DD-MM-YYYY');

    //Juros ativo mas não incluído
    if(this.formCalc.get("fcJuros")?.value && this.dataTableJuros.length == 0){
      this.setJuros();
    }

    //Fix initial date are not included in between statement
    if (INDICES.includes('TJ')){
      data_ini = moment(dt1).startOf('month').subtract(1, "days").format('DD-MM-YYYY');    
    }
    this.service.getIndice(INDICES, data_ini?.toString(), data_fim?.toString()).subscribe((res: any) => {
      this.ResponseIndice = res.content
      if (this.ResponseIndice.length > 0) {
        this.setCalc(this.ResponseIndice);
        this.calcSumTotals();

      }
    })

  }

  calcTaxa(taxa:number, dias:number){
    return ((taxa / 360) * dias);
  }

  calcJuros(valor:number, taxa:number, dias:number){
    return this.calcTaxa(taxa, dias) * valor;
  }

  public clearForm() {
    this.formCalc.reset();
    this.dataTableJuros = [];
    this.dataTableAbatimentos = [];
  }

  /*
  * @Todo Refactor 
  */
  setCalc(data: any) {
    let maior = 0;
    let dtIni = this.formCalc.get("fcDtIniLanca")?.value;
    let dtFim = this.formCalc.get("fcDtFimLanca")?.value;
    let juros: any = [];
    let jurosDtPoupanca = 0;
    let jurosDias = 0;
    let jurosTaxa = 0;
    let jurosTaxaAcumulada = 0;
    let jurosTaxaTotal = 0;
    let jurosValor = 0;
    let jurosValorTotal = 0;
    let dias = this.days360(dtIni, dtFim);
    let respIndice;
    let fatores = [];
    let fatorMax: number;
    let fatorMin: number;
    let fatorIni: number;
    let fatorFim: number;
    let fatorDivisao: number;
    let fatorCalculo: number;
    let fatorCalculoMemoria: number;
    let acumuladoFim: number;
    let valorAtualizado: number;

    fatores = data.map((d: any) => d.fator);
    fatorMax = Math.max(...fatores);
    fatorMin = Math.min(...fatores);
    fatorIni = fatores[0];
    fatorFim = fatores[fatores.length - 1];

    //Verificar se a data fim não é superior ao último índice
    if (this.formCalc.get("fcIndiceLanca")?.value.includes('TJ899') && dtFim >= '2021-01-01'){
      fatorFim = 1.0000000000;
    }
    fatorDivisao = fatorIni / fatorFim;
    //fatorDivisao = 2.02941176;
    acumuladoFim = data[data.length - 1].acumulado;
    fatorCalculo = data[0].valor ? acumuladoFim : fatorDivisao;
    valorAtualizado = fatorCalculo * this.formCalc.get("fcValorLanca")?.value,

    respIndice = data[0].nome;
    console.log(respIndice, data[0].data, fatorIni, data[data.length - 1].data, fatorFim, fatorDivisao, acumuladoFim);
    this.dataTableRelatorio = [];

    //Abatimentos
    this.dataTableAbatimentos.map((a: any) =>{

    })

    //Juros
    if (this.formCalc.get("fcJuros")?.value == true) {
      this.dataTableJuros.map((j: any) => {
        switch (j.indice) {
          case 'codigo_civil':
            if(j.dtIni <= "2003-01-10"){
              jurosTaxa = 0.06;
              jurosDtPoupanca = j.dtFim < '2003-01-10' ? j.dtFim : '2003-01-10';
              jurosDias = this.days360(j.dtIni, jurosDtPoupanca);
              jurosTaxaAcumulada = this.calcTaxa(jurosTaxa, jurosDias);
              jurosTaxaTotal = jurosTaxaTotal + jurosTaxaAcumulada;
              jurosValor = this.calcJuros(valorAtualizado, jurosTaxa, jurosDias);
              jurosValorTotal = jurosValorTotal + jurosValor;
              juros.push({
                valor: jurosValor,
                indice: j.indice,
                taxa: jurosTaxa,
                taxaAcumulada: jurosTaxaAcumulada,
                dias: jurosDias,
                dtIni: j.dtIni,
                dtFim: jurosDtPoupanca
              })
            }
            if(j.dtFim >= "2003-01-11"){
              jurosTaxa = 0.12;
              jurosDtPoupanca = j.dtIni > '2003-01-11' ? j.dtIni : '2003-01-11';
              jurosDias = this.days360(jurosDtPoupanca, j.dtFim);
              jurosTaxaAcumulada = this.calcTaxa(jurosTaxa, jurosDias);
              jurosTaxaTotal = jurosTaxaTotal + jurosTaxaAcumulada;
              jurosValor = this.calcJuros(valorAtualizado, jurosTaxa, jurosDias);
              jurosValorTotal = jurosValorTotal + jurosValor;
              juros.push({
                valor: jurosValor,
                indice: j.indice,
                taxa: jurosTaxa,
                taxaAcumulada: jurosTaxaAcumulada,
                dias: jurosDias,
                dtIni: jurosDtPoupanca,
                dtFim: j.dtFim
              })
            }
          break;
          default:
            jurosTaxa = j.taxa;
            jurosDias = this.days360(dtIni, dtFim);
            jurosTaxaAcumulada = this.calcTaxa(jurosTaxa, jurosDias);
            jurosTaxaTotal = jurosTaxaTotal + jurosTaxaAcumulada;
            jurosValor = this.calcJuros(valorAtualizado, jurosTaxa, jurosDias);
            jurosValorTotal = jurosValorTotal + jurosValor;
            juros.push({
              valor: jurosValor,
              indice: j.indice,
              taxa: jurosTaxa,
              taxaAcumulada: jurosTaxaAcumulada,
              dias: jurosDias,
              dtIni: j.dtIni,
              dtFim: j.dtFim
            })
            break;
        } 
      })
    }

    //Memória de Calculos
    //@todo refazer, incluir juros.
    data.map((x: any) => {
      fatorCalculoMemoria = x.valor ? x.acumulado : fatorDivisao;
      this.dataTableRelatorio.push({
        //indice: x.nome,
        data: x.data,
        fator: x.fator,
        valorIndice: x.valor ? x.valor : fatorDivisao,
        acumulado: x.acumulado,
        fatorUsed: fatorCalculoMemoria,
        valorCorrecao: (x.fator * this.formCalc.get("fcValorLanca")?.value) - this.formCalc.get("fcValorLanca")?.value,
        valorCorrecaoAcumulado: (fatorCalculoMemoria * this.formCalc.get("fcValorLanca")?.value) - this.formCalc.get("fcValorLanca")?.value,
        result: fatorCalculoMemoria * this.formCalc.get("fcValorLanca")?.value
      })
    })

    this.dados.push({
      dtIni: dtIni,
      dtFim: dtFim,
      indice: respIndice,
      dias: dias,
      principal: this.formCalc.get("fcValorLanca")?.value, //valor do índice
      jurosValorTotal: jurosValorTotal,
      fatorAplicado: fatorCalculo,
      valorAtualizado: valorAtualizado,
      valorCorr: (fatorCalculo * this.formCalc.get("fcValorLanca")?.value) + jurosValorTotal,
      correcao: ((fatorCalculo * this.formCalc.get("fcValorLanca")?.value) + jurosValorTotal) - (this.formCalc.get("fcValorLanca")?.value),
      memoria: this.dataTableRelatorio,
      juros: juros
    });

    this.dataSourceLanca = new MatTableDataSource<ElementLanc>(this.dados)
    console.log('dataSourceLanca', this.dataSourceLanca)
    //this.clearForm();
  }


  public downloadAsPDF() {

    const data2 = document.getElementById('pdfTable') as HTMLElement;
    // var win = window.open('', '_blank');

    var html = htmlToPdfmake(data2.innerHTML);

    const documentDefinition = { content: html }

    // Abri o 
    // pdfMake.createPdf(documentDefinition).print({}, win); 

    pdfMake.createPdf(documentDefinition).open();


  }
  public makePDF() {

    var quotes = document.getElementById('pdfTable') as HTMLElement;

    html2canvas(quotes).then(canvas => {


      //! MAKE YOUR PDF
      var pdf = new jsPDF('p', 'pt', 'letter');

      for (var i = 0; i <= quotes.clientHeight / 980; i++) {
        //! This is all just html2canvas stuff
        var srcImg = canvas;
        var sX = 0;
        var sY = 980 * i; // start 980 pixels down for every new page
        var sWidth = 900;
        var sHeight = 980;
        var dX = 0;
        var dY = 0;
        var dWidth = 900;
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

        var width = canvas.width;
        var height = canvas.clientHeight;

        //! If we're on anything other than the first page,
        // add another page

        //! now we declare that we're working on that page
        //pdf.setPage(i+1);
        //! now we add content to that page!
        pdf.addImage(canvasDataURL, 'PNG', 20, 40, (width * .62), (height * .62));

      }
      //! after the for loop is finished running, we save the pdf.
      pdf.save('test.pdf');
    });

  }

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