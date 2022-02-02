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
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatAlertComponent } from '../material/mat-alert/mat-alert.component';
import { MatConfirmComponent } from '../material/mat-confirm/mat-confirm.component';
import { MatInputPromptComponent } from '../material/mat-input-prompt/mat-input-prompt.component';
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
  descricao: string;
  juros: any;
}export interface ElementJuros {
  indice: number;
  taxa: string;
  taxaAcumulada: string;
  dtIni: any;
  dtFim: any;
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

  constructor(public service: CalcService, private dialog: MatDialog) { 
    const currentYear = new Date().getFullYear();
    //this.minDate = new Date(currentYear - 20, 0, 1);
    this.maxDate = new Date();
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
  }

  alertDialog(title:string, message: string): void {
    const dialogRef = this.dialog.open(MatAlertComponent, {
      data: {
        title: title,
        message: message,
      },
    });
  }

  confirmDialog(title: string, message: string): void {
    const ref: MatDialogRef<MatConfirmComponent> =  
    this.dialog.open(MatConfirmComponent, {
      width: '600px',
      height: '210px',
      data: {
        title: title,
        message: message
      },
      backdropClass: 'confirmDialogComponent',
      hasBackdrop: true
    });
  }

  showReplicationPrompt(title: string, id: number): void {
    const dialogRef = this.dialog.open(MatInputPromptComponent, { 
      width: '300px', 
      height: '350px',
      data:{
        title: title,
        form: {
          qty: ['', [Validators.required, Validators.minLength(10)]]
        },
        inputs:{
          qty: {label: 'Parcelas', type: 'number'}
        }
      } 
      });

    dialogRef.componentInstance.params = {
      parentFunction:(data:any)=>{
          //manipulate `fromDialog` data
          //return back to dialog 
            return this.replicateDate(id, data.qty);
      }
    }      

    dialogRef.afterClosed().subscribe((data) => {
      if (data.clicked === 'submit') {
        this.setReplication(id, data.form.qty);
      }
    });
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
  days360(dateA: Date, dateB: Date) {

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

  public removeAllRows(){
    if(confirm("Deseja EXCLUIR TODOS lançamento?")) {
      this.dataSourceLanca = new MatTableDataSource<ElementLanc>();
      this.dados = [];
      this.calcSumTotals();
    }
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
    this.dataSourceJuros = new MatTableDataSource<ElementJuros>();
    this.dataTableAbatimentos = [];
    this.dataSourceAbatimentos = new MatTableDataSource<ElementAbatimentos>();
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

  public isDateBefore(dtIni:string, dtFim:string){
    return Date.parse(dtIni) < Date.parse(dtFim);
  }

  public setJuros(){
    try {
      let valorPrincipal = this.formCalc.get("fcValorLanca")?.value;
      let jurosIndice = (this.formCalc.get("fcIndiceJuros")?.value);
      let jurosTaxa = (this.formCalc.get("fcTaxaJuros")?.value);
      let jurosDtIni = moment(this.formCalc.get("fcDtIniJuros")?.value);
      let jurosDtFim = moment(this.formCalc.get("fcDtFimJuros")?.value);
      this.addJuros({ valorPrincipal, jurosIndice, jurosTaxa, jurosDtIni, jurosDtFim });
    } catch (e) {
      console.log(e);
    }

  }

  //@Todo incluir selic, caderneta de poupança, order by date
  public async addJuros({ valorPrincipal, jurosIndice, jurosTaxa, jurosDtIni, jurosDtFim, clearJuros = false, onFinish }: { valorPrincipal: number; jurosIndice: string; jurosTaxa: number; jurosDtIni: any; jurosDtFim: any; clearJuros?: Boolean, onFinish?: any | undefined}) {
    let data :any = [];

    //let valorPrincipal = this.formCalc.get("fcValorLanca")?.value;

    if (valorPrincipal < 0 || !jurosIndice || !jurosDtIni.isValid() || !jurosDtFim.isValid()){
      this.alertDialog('Atenção!', 'Preencha todos os campos corretamente.');
      return false;
    }

    if (clearJuros) {
      this.clearJurosData();
    }

    let defDataCodigoCivil = moment('2003-01-10');
    let defDataCodigoCivilFim = moment(defDataCodigoCivil).add(1, 'days');
    let defDataPoupanca = moment('2012-05-03');
    let defDataPoupancaFim = moment(defDataPoupanca).add(1, 'days');
    jurosDtIni = moment(jurosDtIni);
    jurosDtFim = moment(jurosDtFim);

    let jurosDt : any;
    let jurosDias = 0;
    let jurosTaxaAcumulada = 0;
    let jurosTaxaTotal = 0;
    let jurosDtSelic: any;

    let indiceAcumulados : any;
    let indice = null;
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
            indice = await this.service.getIndice('POUPANTIGA', jurosDtIni?.format('DD-MM-YYYY').toString(), jurosDtFim?.format('DD-MM-YYYY').toString()).subscribe((res: any) => {
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
            indice = await this.service.getIndice('POUPNOVA',  jurosDtIni?.format('DD-MM-YYYY').toString(), jurosDtFim?.format('DD-MM-YYYY').toString()).subscribe((res: any) => {
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
          indice = await this.service.getIndice(jurosIndice, jurosDtIni?.format('DD-MM-YYYY').toString(), jurosDtFim?.format('DD-MM-YYYY').toString()).subscribe((res: any) => {
            data = res.content
            if (data.length > 0) {
              jurosDias = this.days360(jurosDtIni, jurosDtFim);
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
    onFinish && await onFinish()
    return indice ? Promise.resolve(indice) : Promise.resolve('without indice');
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

  public setLancamento(){
    try {
      let indiceOption: string = this.formCalc.get("fcIndiceLanca")?.value;
      let valorPrincipal = this.formCalc.get("fcValorLanca")?.value;
      let dtIni = moment(this.formCalc.get("fcDtIniLanca")?.value).format("YYYY-MM-DD");
      let dtFim = moment(this.formCalc.get("fcDtFimLanca")?.value).format("YYYY-MM-DD");
      let descricao = this.formCalc.get("fcDescricao")?.value == "Outros" ? this.formCalc.get("fcDescricaoOutros")?.value : this.formCalc.get("fcDescricao")?.value;

      //Juros ativo mas não incluído
      if(this.formCalc.get("fcJuros")?.value && this.dataTableJuros.length == 0){
        this.setJuros();
      }

      this.addLancamento(indiceOption, valorPrincipal, dtIni, dtFim, descricao);
    }
    catch(e){
      console.log(e);
    }
  }

  public async addLancamento(indiceOption: string, valorPrincipal:number, dtIni: any, dtFim: any, descricao: string){ 
    try{
    dtIni = moment(dtIni);
    dtFim = moment(dtFim);
      let dtIniGetIndice = null;

    /**
     * Correção Monetária
     **/
      //let correcao: any = [];
    if(indiceOption == 'sem-correcao'){
        this.dataSourceCorrecao = this.addCalcSemCorrecao(valorPrincipal);
        await this.setCalc(valorPrincipal, dtIni, dtFim, descricao);
        await this.calcSumTotals();
        //await this.clearForm();
    }else{
      if (indiceOption.includes('TJ')){
        //Fix initial date are not included in between statement
        //data_ini = moment(dt1).startOf('month').subtract(1, "days").format('DD-MM-YYYY');    
          dtIniGetIndice = moment(dtIni).startOf('month');    
      }
        dtIniGetIndice = dtIniGetIndice ? dtIniGetIndice : dtIni;
        const indiceRes: any = await this.service.getIndice(indiceOption, dtIniGetIndice?.format("DD-MM-YYYY").toString(), dtFim.format("DD-MM-YYYY").toString()).toPromise()
        this.ResponseIndice = indiceRes.content;
        if (this.ResponseIndice.length > 0) {
          this.dataSourceCorrecao =  this.addCalcCorrecao(indiceOption, valorPrincipal, dtFim);
          await this.setCalc(valorPrincipal, dtIni, dtFim, descricao);
          await this.calcSumTotals();
          //await this.clearForm();
        }else {
            this.alertDialog('Atenção!', 'Indices indisponíveis para as opções escolhidas.');
        }
    }
    }
    catch(e){
      console.log(e);
    }
    return Promise.resolve(true)
  }

  public calcTaxa(taxa:number, dias:number){
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

  orderDatesArray(dates: any){
    let orderedDates = dates.sort(function(a: any, b: any){
      return Date.parse(a) > Date.parse(b);
    });
    return orderedDates;
  }

  //@todo order by date
  setCalcJuros(valor:number, dataJuros:any){

    let juros: any = [];
    let jurosValor = 0;

    dataJuros.map((j: any, i: number) => {
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

  addCalcSemCorrecao(valorPrincipal:number){
    let correcao: any = [];

    correcao = {
      indice: 'SEM CORREÇÃO',
      valorAtualizado: valorPrincipal,
      fatorIni: '',
      fatorFim: '',
      fatorDivisao: '',
      fatorCalculo: ''
    }

    return correcao;
  }

  addCalcCorrecao(indiceOption:string, valorPrincipal:number, dtFim: Date){
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
    if (indiceOption.includes('TJ11960') && dtFim == this.dataHoje){    
      fatorCalculo = data[0].fator;
    }else{
      fatorCalculo = data[0].valor ? acumuladoFim : fatorDivisao;
    }
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
   setCalc(valorPrincipal:number, dtIni:Date, dtFim:Date, descricao:string) {
    let correcao: any = this.dataSourceCorrecao;
    let juros: any = [];
    let jurosValorTotal = 0;
    let jurosDiasTotal = 0;
    let dias = this.days360(dtIni, dtFim);

  

    //Abatimentos
    if (this.dataTableAbatimentos?.length > 0) {
      this.dataTableAbatimentos.map((a: any) =>{

      })
    }

    //Juros
    if (this.dataSourceJuros.data?.length > 0 && this.formCalc.get("fcJuros")?.value == true) {
        juros = this.setCalcJuros(correcao.valorAtualizado, this.dataSourceJuros.data );
        jurosValorTotal = juros.reduce(function(jurosAcc:number, jurosCurr:any){ return jurosAcc + jurosCurr.valor;}, 0);
        jurosDiasTotal = juros.reduce(function(jurosDiasAcc:number, jurosCurr:any){ return jurosDiasAcc + jurosCurr.dias;}, 0);
        let totJurosDias = 0;
        for (dias of juros ){
          totJurosDias += juros.dias;
        }
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
  }

  public replicateDate(index:number, qty:number = 1) {
    let dtIni = this.dataSourceLanca.data[index].dtIni;
    let newDate:any = [];
    for(let i = 0; i < qty; i++){
      newDate.push(moment(dtIni).add(i, "months").format('YYYY-MM-DD')); 
    }
    return newDate;
  }

  fixIndices(indice : string) {
    switch(indice){
      case 'SEM CORREÇÃO':
        return 'sem-correcao';
      break;
      case 'LEI 6.899/81':
        return 'TJ899';
      break;
      case 'LEI 11.960/2009':
        return 'TJ11960';
      break;
      default:
        return indice;
      break;
    }
  }

  sortByDtIni() {
    this.dataSourceLanca.data.sort((a: any, b: any) => {
        if (Date.parse(moment(a.dtIni).format("YYYY-MM-DD").toString()) < Date.parse(moment(b.dtIni).format("YYYY-MM-DD").toString())) {
            return -1;
        } else if (Date.parse(moment(a.dtIni).format("YYYY-MM-DD").toString()) > Date.parse(moment(b.dtIni).format("YYYY-MM-DD").toString())) {
            return 1;
        } else {
            return 0;
        }
    });
  }

  async setReplication(index:number, qty:number = 1){
    let newDate = this.replicateDate(index, qty);
    newDate.shift();
    let replicaSet: any[] = [];
    let replicaJuros = [];
    let dataTableJurosMemory = this.dataTableJuros;

    for(let i = 0; i < newDate.length; i++){
      replicaJuros = [];
      let indiceOption = this.fixIndices(this.dataSourceLanca.data[index].indice);
      let valorPrincipal = this.dataSourceLanca.data[index].principal;
      let dtIni = moment(newDate[i]);
      let dtFim = moment(this.dataSourceLanca.data[index].dtFim);
      let descricao = this.dataSourceLanca.data[index].descricao;

      if(this.dataSourceLanca.data[index].juros?.length > 0){
        let jurosIndice = this.dataSourceLanca.data[index].juros[0].indice;
        let jurosTaxa = this.dataSourceLanca.data[index].juros[0].taxa;
        let datasJuros = this.dataSourceLanca.data[index].juros.map((d: any) => moment(d.dtIni)?.format('YYYY-MM-DD').toString());
        let dataJurosMin = this.orderDatesArray(datasJuros);
        let dataJurosMinUpdated = moment(dataJurosMin[0]).add(i+1, "months").format('YYYY-MM-DD').toString();
        let dataJurosAplicado = this.isDateBefore(dataJurosMinUpdated, newDate[i]) ? newDate[i] : dataJurosMinUpdated;
        dataJurosAplicado = moment(dataJurosAplicado);

        replicaJuros.push({
          jurosIndice: jurosIndice,
          jurosTaxa: jurosTaxa,
          dtIni: dataJurosAplicado,
          dtFim: dtFim
        })
      }

      replicaSet.push({
        dtIni: dtIni,
        dtFim: dtFim,
        indice: indiceOption,
        valorPrincipal: valorPrincipal, 
        descricao: descricao,
        juros: replicaJuros
      });
    }
        
    function* addReplication() {
      let index = 0;

      while(index <= replicaSet.length) {
        yield index++
      }
      }

    const generator = addReplication()
    const applyReplication = async () => {
      const indiceLancamento = generator.next().value 
      const lancamento = replicaSet[indiceLancamento as number]
      
      if (lancamento !== undefined) {
        try {
          let { dtIni: jurosDtIni, dtFim: jurosDtFim, valorPrincipal, jurosIndice, jurosTaxa} = lancamento.juros[0];
          if(lancamento.juros.length){
            await this.addJuros({ valorPrincipal, jurosIndice, jurosTaxa, jurosDtIni, jurosDtFim, clearJuros: true })
            await this.addLancamento(lancamento.indice, lancamento.valorPrincipal, lancamento.dtIni, lancamento.dtFim, lancamento.descricao)
            applyReplication()
        }else{
            await this.addLancamento(lancamento.indice, lancamento.valorPrincipal, lancamento.dtIni, lancamento.dtFim, lancamento.descricao)
            applyReplication()
          }
        } catch(e) {
          console.log(e)
            }
        }
    }

    applyReplication()

  }

  async clearJurosData(){
    this.dataTableJuros = [];
    this.dataSourceJuros = new MatTableDataSource<ElementJuros>();
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