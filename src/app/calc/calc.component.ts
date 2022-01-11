import { Component, OnInit, ViewChild, ElementRef, Injectable } from '@angular/core';
import { CalcService } from '../services/calc.service'
import { Reports } from '../reports/reports'
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

import html2canvas from "html2canvas"

import { retry, catchError, tap, map, retryWhen, filter, mergeMap } from 'rxjs/operators';

let report = new Reports();

const dateFormat = require('dateformat');
const moment = require('moment');
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

  //minDate: Date;
  maxDate: Date;
  // Mostrar memória de cálculo
  isActive = false;
  pipe = new DatePipe('pt');

  myFormattedDate = moment(Date.now()).format('LL')
  dataHoje = moment(Date.now()).format('YYYY-MM-DD');

  public ResponseIndice: responseIndice[] = [];
  //public ResponseIndice: Observable<responseIndice>;
  //ResponseIndice = [];
  public sumTotal = 0;
  public sumTotalAtualizado = 0;
  public sumTotalCorr = 0;
  public sumTotalJuros = 0;

  constructor(public service: CalcService) { 
    const currentYear = new Date().getFullYear();
    //this.minDate = new Date(currentYear - 20, 0, 1);
    this.maxDate = new Date();
  }

  public formCalc = new FormGroup({
    //Lançamentos
    fcTipos: new FormControl(""),
    fcListaLancamento: new FormControl(""),
    fcDtIniLanca: new FormControl(""),
    fcDtFimLanca: new FormControl(this.dataHoje),
    fcValorLanca: new FormControl(""),
    fcIndiceLanca: new FormControl(""),
    fcDescricao: new FormControl(""),
    fcDescricaoOutros: new FormControl(""),
    //Juros
    fcJuros: new FormControl(""),
    fcDtIniJuros: new FormControl(""),
    fcDtFimJuros: new FormControl(this.dataHoje),
    fcValorJuros: new FormControl(""),
    fcIndiceJuros: new FormControl(""),
    fcTaxaJuros: new FormControl(""),
    //Abatimentos
    fcAbatimentos: new FormControl(""),
    fcDtAbatimento: new FormControl(""),
    fcValorAbatimento: new FormControl(""),
  })

  firstFormGroup: FormGroup = this.formCalc;
  dados: any = [];
  dataSourceLanca = new MatTableDataSource<ElementLanc>(this.dados);
  dataSourceCorrecao: any = [];
  dataTableRelatorio: any = [];
  dataTableJuros: any = [];
  dataSourceJuros = new MatTableDataSource<ElementJuros>(this.dataTableJuros);
  dataTableAbatimentos: any = [];
  dataSourceAbatimentos = new MatTableDataSource<ElementAbatimentos>(this.dataTableAbatimentos);

    
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
    "position",
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
    //this.formCalc.reset();
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

  public isDateBefore(dtIni:Date, dtFim:Date){
    return dtIni < dtFim;
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

    let jurosDt : any;
    let jurosDias = 0;
    let jurosTaxaAcumulada = 0;
    let jurosTaxaTotal = 0;
    let jurosDtSelic: any;

    let indiceAcumulados : any;

    switch (jurosIndice) {
      case 'codigo_civil':
        if(jurosDtIni <= defDataCodigoCivil){
          jurosTaxa = 0.06;
          jurosDt = jurosDtFim > defDataCodigoCivil ? defDataCodigoCivil : jurosDtFim ;
          jurosDias = this.days360(jurosDtIni, jurosDt);
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
            dtFim: jurosDt
          })
        }
        if(jurosDtFim >= defDataCodigoCivilFim){
          jurosTaxa = 0.12;
          jurosDt = jurosDtIni > defDataCodigoCivilFim ? jurosDtIni : defDataCodigoCivil;
          jurosDias = this.days360(jurosDt, jurosDtFim);
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
            dtIni: jurosDt,
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
                jurosDt = jurosDtFim > defDataPoupanca ? defDataPoupanca : jurosDtFim ;
                jurosDias = this.days360(jurosDtIni, jurosDt);
                data.sort((a:any, b:any) => {
                  return new Date(a.data).getTime() - new Date(b.data).getTime();
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
                  dtFim: jurosDt
                })
              }
            })
          }
          if(jurosDtFim >= defDataPoupancaFim){
            this.service.getIndice('POUPNOVA', jurosDtIni?.format('DD-MM-YYYY').toString(), jurosDtFim?.format('DD-MM-YYYY').toString()).subscribe((res: any) => {
              data = res.content
              if (data.length > 0) {
                jurosDt = jurosDtIni >defDataPoupancaFim ? jurosDtIni : defDataPoupanca;
                jurosDias = this.days360(jurosDt, jurosDtFim);
                data.sort((a:any, b:any) => {
                  return new Date(a.data).getTime() - new Date(b.data).getTime();
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
                  dtIni: jurosDt,
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
                return new Date(a.data).getTime() - new Date(b.data).getTime();
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
    let valorPrincipal = this.formCalc.get("fcValorLanca")?.value;
    let dtIni = moment(this.formCalc.get("fcDtIniLanca")?.value).format("YYYY-MM-DD");
    let dtFim = moment(this.formCalc.get("fcDtFimLanca")?.value).format("YYYY-MM-DD");
    let indiceOption: string = this.formCalc.get("fcIndiceLanca")?.value;

    //Juros ativo mas não incluído
    if(this.formCalc.get("fcJuros")?.value && this.dataTableJuros.length == 0){
      this.setJuros();
    }

    /**
     * Correção Monetária @Todo Transformar em promise
     **/
    let correcao: any = [];
    if(indiceOption == 'sem-correcao'){
      correcao = this.setCalcSemCorrecao(valorPrincipal);
      this.setCalc();
      this.calcSumTotals();
      this.clearForm();
    }else{
      //Fix initial date are not included in between statement
      /*if (INDICES.includes('TJ')){
        data_ini = moment(dt1).startOf('month').subtract(1, "days").format('DD-MM-YYYY');    
      }
      */
      this.service.getIndice(indiceOption, moment(dtIni)?.format("DD-MM-YYYY").toString(), moment(dtFim)?.format("DD-MM-YYYY").toString()).subscribe((res: any) => {
        this.ResponseIndice = res.content
        if (this.ResponseIndice.length > 0) {
          this.dataSourceCorrecao =  this.setCalcCorrecao(valorPrincipal);
          this.setCalc();
          this.calcSumTotals();
          this.clearForm();
        }
      })
    }



  }

  calcTaxa(taxa:number, dias:number){
    return ((taxa / 360) * dias);
  }

  calcTaxaAcumulada(taxa:number, dias:number){
    return ((taxa * 360) / dias)
  }

  calcJuros(valor:number, taxa:number, dias:number){
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
        taxaAcumulada: j.taxaAcumulada,
        dias: j.dias,
        dtIni: j.dtIni,
        dtFim: j.dtFim
      })

    });

    return juros;
  }

  setCalcSemCorrecao(valorPrincipal:number){
    let correcao: any = [];

    correcao = {
      indice: 'SEM CORREÇÃO',
      valorAtualizado: valorPrincipal,
      fatorIni: '',
      fatorFim: '',
      fatorDivisao: '',
      fatorCalculo: ''
    }
    this.dataSourceCorrecao = correcao;
    return;
  }


  setCalcCorrecao(valorPrincipal:number){
    let data :any = this.ResponseIndice;
    let indice = data[0].nome;
    let correcao: any = [];
    let fatores = [];
    let fatorMax: number;
    let fatorMin: number;
    let fatorIni: number;
    let fatorFim: number;
    let fatorDivisao: number;
    let fatorCalculo: number;
    let acumuladoFim: number;
    let valorAtualizado: number;

    fatores = data.map((d: any) => d.fator);
    fatorMax = Math.max(...fatores);
    fatorMin = Math.min(...fatores);
    fatorIni = fatores[0];
    fatorFim = fatores[fatores.length - 1];

    //@Todo Verificar se a data fim não é superior ao último índice existente no DB
    /*if (this.formCalc.get("fcIndiceLanca")?.value.includes('TJ899') && dtFim >= indiceDataAtualizacao){
      fatorFim = 1.0000000000;
    }*/
    fatorDivisao = fatorIni / fatorFim;
    acumuladoFim = data[data.length - 1].acumulado;
    fatorCalculo = data[0].valor ? acumuladoFim : fatorDivisao;
    valorAtualizado = fatorCalculo * valorPrincipal;
    correcao = {
      indice: indice,
      valorAtualizado: valorAtualizado,
      fatorIni: fatorIni,
      fatorFim: fatorFim,
      fatorDivisao: fatorDivisao,
      fatorCalculo: fatorCalculo
    }
    return correcao;
  }
  
  //Memória de Calculos
  setCalcMemoria(correcao:any, juros:any){
    let valorPrincipal = this.formCalc.get("fcValorLanca")?.value;
    let data :any = this.ResponseIndice;
    let fatorCalculoMemoria: number;

    //@todo refazer, incluir juros.
    data.map((x: any) => {
      fatorCalculoMemoria = x.valor ? x.acumulado : correcao.fatorDivisao;
      this.dataTableRelatorio.push({
        //indice: x.nome,
        data: x.data,
        fator: x.fator,
        valorIndice: x.valor ? x.valor : correcao.fatorDivisao,
        acumulado: x.acumulado,
        fatorUsed: fatorCalculoMemoria,
        valorCorrecao: (x.fator * valorPrincipal) - valorPrincipal,
        valorCorrecaoAcumulado: (fatorCalculoMemoria * valorPrincipal) - valorPrincipal,
        result: fatorCalculoMemoria * valorPrincipal
      })
    })
  }

  /*
  * @Todo Refactor 
  */
   setCalc() {
    let valorPrincipal = this.formCalc.get("fcValorLanca")?.value;
    let dtIni = moment(this.formCalc.get("fcDtIniLanca")?.value).format("YYYY-MM-DD");
    let dtFim = moment(this.formCalc.get("fcDtFimLanca")?.value).format("YYYY-MM-DD");
    let descricao = this.formCalc.get("fcDescricao")?.value == "Outros" ? this.formCalc.get("fcDescricaoOutros")?.value : this.formCalc.get("fcDescricao")?.value;
    let correcao: any = this.dataSourceCorrecao;
    let juros: any = [];
    let jurosValorTotal = 0;
    let jurosDiasTotal = 0;
    let dias = this.days360(dtIni, dtFim);

  

    //Abatimentos
    if (this.formCalc.get("fcAbatimentos")?.value == true) {
      this.dataTableAbatimentos.map((a: any) =>{

      })
    }

    //Juros
    if (this.formCalc.get("fcJuros")?.value == true) {
        //juros = this.setCalcJuros(valorPrincipal, this.dataTableJuros );
        juros = this.setCalcJuros(correcao.valorAtualizado, this.dataTableJuros );

        jurosValorTotal = juros.reduce(function(jurosAcc:number, jurosCurr:any){ return jurosAcc + jurosCurr.valor;}, 0);
        jurosDiasTotal = juros.reduce(function(jurosDiasAcc:number, jurosCurr:any){ return jurosDiasAcc + jurosCurr.dias;}, 0)
    }
    
    this.setCalcMemoria(correcao, juros);

    this.dados.push({
      dtIni: dtIni,
      dtFim: dtFim,
      indice: correcao.indice,
      dias: dias,
      principal: valorPrincipal, 
      descricao: descricao,
      jurosValorTotal: jurosValorTotal,
      jurosDiasTotal: jurosDiasTotal,
      fatorAplicado: correcao.fatorCalculo,
      valorAtualizado: correcao.valorAtualizado,
      valorCorr: correcao.valorAtualizado + jurosValorTotal,
      correcao: (correcao.valorAtualizado + jurosValorTotal) - (valorPrincipal),
      memoria: this.dataTableRelatorio,
      juros: juros
    });

    this.dataSourceLanca = new MatTableDataSource<ElementLanc>(this.dados)
    console.log('dataSourceLanca', this.dataSourceLanca)
  }

  downloadAsPDF(id: string){
    report.downloadAsPDF(id, this.myFormattedDate, '/assets/imgs/LOGO_MPRJ_GATE.png');
  }

  makePDF(id: string){
    let format = 'p';
    if (this.sumTotal.toString().length >= 9 && this.sumTotalAtualizado.toString().length >= 9){
      format = 'l';	
    }
    report.makePDF(id, this.myFormattedDate, '/assets/imgs/LOGO_MPRJ_GATE.png', format);
  }

  printHtml(id: string){
    report.printHtml(id);
  }

}