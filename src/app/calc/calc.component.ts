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
let htmlToPdfmake = require("html-to-pdfmake");
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
  // Mostrar memória de cálculo
  isActive = false;

  //datahoje = dateFormat(Date.now(), "dddd  mmm  yyyy, hh:MM:ss");
  pipe = new DatePipe('pt');
   myFormattedDate = moment(Date.now()).format('LL')
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
    public sumTotal = 0;
    public sumTotalAtualizado = 0;
    public sumTotalCorr = 0;
    public sumTotalJuros = 0;
    
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
    let lastDay = new Date(date.getFullYear(), 2, 1);
    return date.getDate() == lastDay;
  }

  //Set type date and fix timestamp 
  setDate(date:string){
    return new Date(date.replace(/-/g, '\/'));
  }

  //@todo check if date is holiday
  setWorkDay(date: any){
    let workDay = moment(date);

    if(workDay.day() == 0 || workDay.day() == 6){
      return workDay.day(1);
    }
    return workDay.format('DD-MM-YYYY');
    
  }

  // Função para Converter ano em ano 360 dias
  // @Todo Em casos específicos está "roubando" 1 dia
  days360(dateA: any, dateB: any) {

    dateA = new Date(dateA);
    dateB = new Date(dateB);

    let dayA = dateA.getDate();
    let dayB = dateB.getDate();

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

    let days = ((dateB.getFullYear() - dateA.getFullYear()) * 360) + (((dateB.getMonth() + 1) - (dateA.getMonth() + 1)) * 30) + (dayB - dayA);
    return days;
  }

  public removeRow(index: number) {
    if(confirm("Deseja EXCLUIR o lançamento?")) {
      this.dataSourceLanca.data.splice(index, 1);
      this.dataSourceLanca._updateChangeSubscription();
      this.calcSumTotals();
    }
  }

  public removeRowJuros(index: number) {
    if(confirm("Deseja EXCLUIR o juros aplicado no período?")) {
      this.dataTableJuros.splice(index, 1);
      //this.dataSourceJuros.data.splice(index, 1);
      //this.dataSourceJuros._updateChangeSubscription();
      //this.calcSumTotals();
    }
  }

  public clearForm() {
    this.formCalc.reset();
    this.dataTableJuros = [];
    this.dataTableAbatimentos = [];
  }

  public calcSumTotals(){
    this.sumTotal = 0;
    this.sumTotalCorr = 0;
    this.sumTotalAtualizado = 0;
    this.sumTotalJuros = 0;
    this.dados.map((x: any) => {
      this.sumTotal = this.sumTotal + x.principal;
      this.sumTotalAtualizado = this.sumTotalAtualizado + x.valorAtualizado;
      this.sumTotalCorr = this.sumTotalCorr + x.valorCorr;
      this.sumTotalJuros = this.sumTotalJuros + x.jurosValorTotal;
    });
  }

  /*
  * @deprecated
  public startJuros(){
    this.formCalc.controls.fcIndiceJuros.setValue('poupanca');
    this.formCalc.controls.fcIndiceJuros.setValue(this.formCalc.get("fcDtIniLanca")?.value);
    this.formCalc.controls.fcIndiceJuros.setValue(this.formCalc.get("fcDtFimLanca")?.value);

  }*/

  public checkDates(dtIni:Date, dtFim:Date){
    return dtIni > dtFim;
  }

  //@Todo incluir selic, caderneta de poupança, order by date
  public setJuros(){
    let data :any = [];

    let valorPrincipal = this.formCalc.get("fcValorLanca")?.value;

    if (valorPrincipal === ''){
      return false;
      //mensagem de error
    }

    let defDataCodigoCivil = moment('2003-01-10');
    let defDataCodigoCivilFim = moment(defDataCodigoCivil).add(1, 'days');
    let defDataPoupanca = moment('2012-05-03');
    let defDataPoupancaFim = moment(defDataPoupanca).add(1, 'days');
    let jurosIndice = (this.formCalc.get("fcIndiceJuros")?.value);
    let jurosTaxa = (this.formCalc.get("fcTaxaJuros")?.value);
    let jurosDtIni = moment(this.formCalc.get("fcDtIniJuros")?.value);
    let jurosDtFim = moment(this.formCalc.get("fcDtFimJuros")?.value);

    let jurosDtPoupanca : any;
    let jurosDias = 0;
    let jurosTaxaAcumulada = 0;
    let jurosTaxaTotal = 0;
    let jurosDtSelic: any;

    let indiceAcumulados : any;

    switch (jurosIndice) {
      case 'codigo_civil':
        if(jurosDtIni <= defDataCodigoCivil){
          jurosTaxa = 0.06;
          jurosDtPoupanca = jurosDtFim > defDataCodigoCivil ? defDataCodigoCivil : jurosDtFim ;
          jurosDias = this.days360(jurosDtIni, jurosDtPoupanca);
          jurosTaxaAcumulada = this.calcTaxa(jurosTaxa, jurosDias);
          jurosTaxaTotal = jurosTaxaTotal + jurosTaxaAcumulada;
          //jurosValor = this.calcJuros(valorAtualizado, jurosTaxa, jurosDias);
          //jurosValorTotal = jurosValorTotal + jurosValor;
          this.dataTableJuros.push({
            //valor: jurosValor,
            indice: jurosIndice,
            taxa: jurosTaxa,
            taxaAcumulada: jurosTaxaAcumulada,
            dias: jurosDias,
            dtIni: jurosDtIni,
            dtFim: jurosDtPoupanca
          })
        }
        if(jurosDtFim >= defDataCodigoCivilFim){
          jurosTaxa = 0.12;
          jurosDtPoupanca = jurosDtIni > defDataCodigoCivilFim ? jurosDtIni : defDataCodigoCivil;
          jurosDias = this.days360(jurosDtPoupanca, jurosDtFim);
          jurosTaxaAcumulada = this.calcTaxa(jurosTaxa, jurosDias);
          jurosTaxaTotal = jurosTaxaTotal + jurosTaxaAcumulada;
          //jurosValor = this.calcJuros(valorAtualizado, jurosTaxa, jurosDias);
          //jurosValorTotal = jurosValorTotal + jurosValor;
          this.dataTableJuros.push({
            //valor: jurosValor,
            indice: jurosIndice,
            taxa: jurosTaxa,
            taxaAcumulada: jurosTaxaAcumulada,
            dias: jurosDias,
            dtIni: jurosDtPoupanca,
            dtFim: jurosDtFim
          })
        }
      break;
      case 'especificar':
        jurosTaxa = jurosTaxa * 0.01;
        jurosDias = this.days360(jurosDtIni, jurosDtFim);
        jurosTaxaAcumulada = this.calcTaxa(jurosTaxa, jurosDias);
        jurosTaxaTotal = jurosTaxaTotal + jurosTaxaAcumulada;
        //jurosValor = this.calcJuros(valorAtualizado, jurosTaxa, jurosDias);
        //jurosValorTotal = jurosValorTotal + jurosValor;
        this.dataTableJuros.push({
          //valor: jurosValor,
          indice: jurosIndice,
          taxa: jurosTaxa,
          taxaAcumulada: jurosTaxaAcumulada,
          dias: jurosDias,
          dtIni: jurosDtIni,
          dtFim: jurosDtFim
        })
        break;
        case 'poupanca':
          if(jurosDtIni <= defDataPoupanca){
            this.service.getIndice('POUPANTIGA', jurosDtIni?.format('DD-MM-YYYY').toString(), jurosDtFim?.format('DD-MM-YYYY').toString()).subscribe((res: any) => {
              data = res.content
              if (data.length > 0) {
                jurosDtPoupanca = jurosDtFim > defDataPoupanca ? defDataPoupanca : jurosDtFim ;
                jurosDias = this.days360(jurosDtIni, jurosDtPoupanca);
                data.sort((a:any, b:any) => {
                  return new Date(b.data).getTime() - new Date(a.data).getTime();
                });
                indiceAcumulados = data.map((d: any) => d.acumulado);
                jurosTaxaAcumulada = indiceAcumulados[indiceAcumulados.length - 1];
                jurosTaxa = this.calcTaxaAcumulada(jurosTaxaAcumulada, jurosDias);
                this.dataTableJuros.push({
                  //valor: jurosValor,
                  indice: jurosIndice,
                  taxa: jurosTaxa,
                  taxaAcumulada: jurosTaxaAcumulada,
                  dias: jurosDias,
                  dtIni: jurosDtIni,
                  dtFim: jurosDtFim
                })
              }
            })
          }
          if(jurosDtFim >= defDataPoupancaFim){
            this.service.getIndice('POUPNOVA', jurosDtIni?.format('DD-MM-YYYY').toString(), jurosDtFim?.format('DD-MM-YYYY').toString()).subscribe((res: any) => {
              data = res.content
              if (data.length > 0) {
                jurosDtPoupanca = jurosDtIni >defDataPoupancaFim ? jurosDtIni : defDataPoupanca;
                jurosDias = this.days360(jurosDtPoupanca, jurosDtFim);
                data.sort((a:any, b:any) => {
                  return new Date(b.data).getTime() - new Date(a.data).getTime();
                });
                indiceAcumulados = data.map((d: any) => d.acumulado);
                jurosTaxaAcumulada = indiceAcumulados[indiceAcumulados.length - 1];
                jurosTaxa = this.calcTaxaAcumulada(jurosTaxaAcumulada, jurosDias);
                this.dataTableJuros.push({
                  //valor: jurosValor,
                  indice: jurosIndice,
                  taxa: jurosTaxa,
                  taxaAcumulada: jurosTaxaAcumulada,
                  dias: jurosDias,
                  dtIni: jurosDtIni,
                  dtFim: jurosDtFim
                })
              }
            })
          }
        break;
        default:
          this.service.getIndice(jurosIndice, jurosDtIni?.format('DD-MM-YYYY').toString(), jurosDtFim?.format('DD-MM-YYYY').toString()).subscribe((res: any) => {
            data = res.content
            if (data.length > 0) {
              jurosDias = this.days360(jurosDtIni, jurosDtFim);
          
              //jurosDtSelic = this.setWorkDay(jurosDtIni);
              //console.log(this.findIndexResponseByDate(jurosDtIni));
              data.sort((a:any, b:any) => {
                return new Date(b.data).getTime() - new Date(a.data).getTime();
              });
              indiceAcumulados = data.map((d: any) => d.acumulado);
              jurosTaxaAcumulada = indiceAcumulados[indiceAcumulados.length - 1];
              jurosTaxa = this.calcTaxaAcumulada(jurosTaxaAcumulada, jurosDias);
              this.dataTableJuros.push({
                //valor: jurosValor,
                indice: jurosIndice,
                taxa: jurosTaxa,
                taxaAcumulada: jurosTaxaAcumulada,
                dias: jurosDias,
                dtIni: jurosDtIni,
                dtFim: jurosDtFim
              })
            }
          })
        break;
    } 

    this.dataSourceJuros = new MatTableDataSource<ElementJuros>(this.dataTableJuros);
    return;
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

  public addLancamento() {

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
    /*if (INDICES.includes('TJ')){
      data_ini = moment(dt1).startOf('month').subtract(1, "days").format('DD-MM-YYYY');    
    }
    */
    this.service.getIndice(INDICES, data_ini?.toString(), data_fim?.toString()).subscribe((res: any) => {
      this.ResponseIndice = res.content
      if (this.ResponseIndice.length > 0) {
        this.setCalc();
        this.calcSumTotals();
      }
    })

  }

  calcTaxa(taxa:number, dias:number){
    //console.log('calcTaxa: ', 'taxa', taxa, 'dias', dias, 'return', ((taxa / 360) * dias));
    return ((taxa / 360) * dias);
  }

  calcTaxaAcumulada(taxa:number, dias:number){
    return ((taxa * 360) / dias)
  }

  calcJuros(valor:number, taxa:number, dias:number){
    console.log('calcJuros', 'valor', valor, 'taxa', taxa, 'dias',dias, 'return', this.calcTaxa(taxa, dias) * valor);
    return this.calcTaxa(taxa, dias) * valor;
  }

  findIndexResponseByDate(data:Date){
    let response :any =  this.ResponseIndice;
    let countLayer :number = response.length;
    for(let x = 0 ; x < countLayer ; x++){
        if(response[x].data == data){
            return response[x];
        }
    }
    return null;
  }

  //@todo order by date
  setCalcJuros(valor:number, dataJuros:any){

    let juros: any = [];
    let jurosValor = 0;

    dataJuros.map((j: any, i: number) => {

      console.log(i, j);
      jurosValor = this.calcJuros(valor, j.taxa, j.dias);
      juros.push({
        valor: jurosValor,
        indice: j.indice,
        taxa: j.taxa,
        taxaAcumulada: j.TaxaAcumulada,
        dias: j.dias,
        dtIni: j.dtIni,
        dtFim: j.dtFim
      })

    });

    return juros;
  }

  //@Todo desacoplar da setCalc()
  setCalcCorrecao(valorPrincipal:number, dtIni:Date, dtFim:Date){
  }
  
  /*
  * @Todo Refactor 
  */
  setCalc() {
    let data :any = this.ResponseIndice;
    let maior = 0;
    let valorPrincipal = this.formCalc.get("fcValorLanca")?.value;
    let dtIni = moment(this.formCalc.get("fcDtIniLanca")?.value).format("YYYY-MM-DD");
    let dtFim = moment(this.formCalc.get("fcDtFimLanca")?.value).format("YYYY-MM-DD");
    let juros: any = [];
    let jurosValorTotal = 0;
    let jurosDiasTotal = 0;
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
    let valorAtualizadoJuros: number;

    fatores = data.map((d: any) => d.fator);
    fatorMax = Math.max(...fatores);
    fatorMin = Math.min(...fatores);
    fatorIni = fatores[0];
    fatorFim = fatores[fatores.length - 1];

    //@Todo Verificar se a data fim não é superior ao último índice retornado
    /*if (this.formCalc.get("fcIndiceLanca")?.value.includes('TJ899') && dtFim >= '2021-01-01'){
      fatorFim = 1.0000000000;
    }*/
    fatorDivisao = fatorIni / fatorFim;
    acumuladoFim = data[data.length - 1].acumulado;
    fatorCalculo = data[0].valor ? acumuladoFim : fatorDivisao;
    valorAtualizado = fatorCalculo * valorPrincipal,

    respIndice = data[0].nome;
    this.dataTableRelatorio = [];

    //Abatimentos
    if (this.formCalc.get("fcAbatimentos")?.value == true) {
      this.dataTableAbatimentos.map((a: any) =>{

      })
    }

    //Juros
    if (this.formCalc.get("fcJuros")?.value == true) {
        //juros = this.setCalcJuros(valorPrincipal, this.dataTableJuros );
        juros = this.setCalcJuros(valorAtualizado, this.dataTableJuros );

        jurosValorTotal = juros.reduce(function(jurosAcc:number, jurosCurr:any){ return jurosAcc + jurosCurr.valor;}, 0);
        jurosDiasTotal = juros.reduce(function(jurosDiasAcc:number, jurosCurr:any){ return jurosDiasAcc + jurosCurr.dias;}, 0)
    }
    
    console.log(respIndice, data[0].data, fatorIni, data[data.length - 1].data, fatorFim, fatorDivisao, acumuladoFim);

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
        valorCorrecao: (x.fator * valorPrincipal) - valorPrincipal,
        valorCorrecaoAcumulado: (fatorCalculoMemoria * valorPrincipal) - valorPrincipal,
        result: fatorCalculoMemoria * valorPrincipal
      })
    })

    this.dados.push({
      dtIni: dtIni,
      dtFim: dtFim,
      indice: respIndice,
      dias: dias,
      principal: valorPrincipal, //valor do índice
      jurosValorTotal: jurosValorTotal,
      jurosDiasTotal: jurosDiasTotal,
      fatorAplicado: fatorCalculo,
      valorAtualizado: valorAtualizado,
      valorCorr: (fatorCalculo * valorPrincipal) + jurosValorTotal,
      correcao: ((fatorCalculo * valorPrincipal) + jurosValorTotal) - (valorPrincipal),
      memoria: this.dataTableRelatorio,
      juros: juros
    });

    this.dataSourceLanca = new MatTableDataSource<ElementLanc>(this.dados)
    console.log('dataSourceLanca', this.dataSourceLanca)
    //this.clearForm();
  }

  public printHtml(id:string) {
    let oPrint
    let oJan = null;
    let layout = '<title>MPRJ - CALCULEI</title><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.0/css/bootstrap.min.css"><style>body{ width:80vw; margin:auto;} div {display: block !important;} #pdfTable th.mat-header-cell {text-align: center;vertical-align: middle;} th {background-color: #4472c4 !important; color: #fff !important; font-weight: bold !important;} @media print {th {background-color: #4472c4 !important; color: #fff !important; font-weight: bold !important;}}</style>';
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
  
  public downloadAsPDF() {

    const data = document.getElementById('pdfTable') as HTMLElement;
    let html = htmlToPdfmake(data.innerHTML);
    console.log(html);
    
    let logoMprjGate = "data:image/png;base64,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";
    
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
          image: logoMprjGate,
          width: 510,
          alignment: 'left'
        },
        {
          text: this.myFormattedDate,
          style: 'header',
          alignment: 'right'
        },
        html
      ],
    }

    // Abri o 
    // pdfMake.createPdf(documentDefinition).print({}, win); 

    pdfMake.createPdf(dd).open();


  }
  public makePDF() {

    let quotes = document.getElementById('pdfTable') as HTMLElement;

    html2canvas(quotes).then(canvas => {


      //! MAKE YOUR PDF
      let pdf = new jsPDF('p', 'pt', 'a4');

      for (let i = 0; i <= quotes.clientHeight / 980; i++) {
        //! This is all just html2canvas stuff
        let srcImg = canvas;
        let sX = 0;
        let sY = 980 * i; // start 980 pixels down for every new page
        let sWidth = 900;
        let sHeight = 980;
        let dX = 0;
        let dY = 0;
        let dWidth = 900;
        let dHeight = 980;

        //window.'' = document.createElement("canvas");
        canvas.setAttribute('width', '900');
        canvas.setAttribute('height', '980');
        let ctx = canvas.getContext('2d');
        // details on this usage of this function: 
        // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Using_images#Slicing
        //ctx.drawImage(srcImg,sX,sY,sWidth,sHeight,dX,dY,dWidth,dHeight);

        // document.body.appendChild(canvas);
        let canvasDataURL = canvas.toDataURL("image/png", 1.0);

        let width = canvas.width;
        let height = canvas.clientHeight;

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
  let doc = new jsPDF('p', 'pt', 'a4');
      let specialElementHandlers = {

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

        let quotes = document.getElementById('content');

        html2canvas(quotes, {
            onrendered: function(canvas) {

            //! MAKE YOUR PDF
            let pdf = new jsPDF('p', 'pt', 'letter');

            for (let i = 0; i <= quotes.clientHeight/980; i++) {
                //! This is all just html2canvas stuff
                let srcImg  = canvas;
                let sX      = 0;
                let sY      = 980*i; // start 980 pixels down for every new page
                let sWidth  = 900;
                let sHeight = 980;
                let dX      = 0;
                let dY      = 0;
                let dWidth  = 900;
                let dHeight = 980;

                window.onePageCanvas = document.createElement("canvas");
                onePageCanvas.setAttribute('width', 900);
                onePageCanvas.setAttribute('height', 980);
                let ctx = onePageCanvas.getContext('2d');
                // details on this usage of this function:
                // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Using_images#Slicing
                ctx.drawImage(srcImg,sX,sY,sWidth,sHeight,dX,dY,dWidth,dHeight);

                // document.body.appendChild(canvas);
                let canvasDataURL = onePageCanvas.toDataURL("image/png", 1.0);

                let width         = onePageCanvas.width;
                let height        = onePageCanvas.clientHeight;

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