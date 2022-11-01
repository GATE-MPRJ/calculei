import { Component, OnInit, ViewChild, ElementRef, Injectable } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
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
  public sumTotalJurosDias = 0;
  public token ="";
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

  constructor(  private route: ActivatedRoute, public service: CalcService, private dialog: MatDialog) { 
    const currentYear = new Date().getFullYear();
    //this.minDate = new Date(currentYear - 20, 0, 1);
    this.maxDate = new Date();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if(this.checkIfValidMD5Hash(params['calculo'])){
        this.token = params['calculo'];
        this.getJsonCalc(this.token);
      }
    });
  }

  ngAfterViewInit(): void {
  }

/**
 * It opens a dialog alert box with a title and a message.
 * @param {string} title - The title of the alert dialog.
 * @param {string} message - string
 */
  alertDialog(title:string, message: string): void {
    const dialogRef = this.dialog.open(MatAlertComponent, {
      data: {
        title: title,
        message: message,
      },
    });
  }

/**
 * It opens a dialog confirmation box with a title and a message.
 * @param {string} title - The title of the dialog box.
 * @param {string} message - string
 */
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

/**
 * It opens a the replication modal box with a title and a form.
 * @param {string} title - string,
 * @param {number} id - The id of the date to be replicated.
 */
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


/* Check if string is a valid MD5 Hash */
 checkIfValidMD5Hash(token:string) {
  // Regular expression to check if string is a MD5 hash
  const regexExp = /^[a-f0-9]{32}$/gi;

  return regexExp.test(token);
}



/**
 * Given a date, return true if the date is the last day of February
 * @param {any} date - The date to check.
 * @returns The last day of February.
 */
  lastDayOfFebruary(date: any) {
    let lastDay = new Date(date.getFullYear(), 2, 1);
    return date.getDate() == lastDay;
  }

/**
 * Given a date string, return a Date object
 * @param {string} date - The date to be converted.
 * @returns The date object.
 */
  setDate(date:string){
    return new Date(date.replace(/-/g, '\/'));
  }

/** 
 * Checking if the date is a weekend (@Todo and holiday) if it is, it will set the date to the next working. 
 */
  setWorkDay(date: any){
    let workDay = moment(date);

    if(workDay.day() == 0 || workDay.day() == 6){
      return workDay.day(1);
    }
    return workDay.format('DD-MM-YYYY');
  }

/**
 * Given two dates, return the number of days between them
 * @param {Date} dateA - The first date.
 * @param {Date} dateB - The date to start with.
 * @returns The number of days between the two dates.
 */
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

/**
 * Clear this.dataSourceLanca and removes all rows from the table lançamentos.
 * Update the total sums.
 */
  public removeAllRows(){
    if(confirm("Deseja EXCLUIR TODOS lançamento?")) {
      this.dataSourceLanca = new MatTableDataSource<ElementLanc>();
      this.dados = [];
      this.calcSumTotals();
    }
  }

/**
 * It removes a row from the table lançamentos.
 * @param {number} index - The index of the row you want to remove.
 */
  public removeRow(index: number) {
    if(confirm("Deseja EXCLUIR o lançamento?")) {
      this.dataSourceLanca.data.splice(index, 1);
      this.dataSourceLanca._updateChangeSubscription();
      this.calcSumTotals();
    }
  }

/**
 * It removes a row from the table juros.
 * @param {number} index - juros index number
 */
  public removeRowJuros(index: number) {
    if(confirm("Deseja EXCLUIR o juros aplicado no período?")) {
      this.dataTableJuros.splice(index, 1);
      //this.dataSourceJuros.data.splice(index, 1);
      //this.dataSourceJuros._updateChangeSubscription();
      //this.calcSumTotals();
    }
  }

/**
 * Clear the form and reset the data tables
 */
  public clearForm() {
    //this.formCalc.reset();
    this.dataTableJuros = [];
    this.dataSourceJuros = new MatTableDataSource<ElementJuros>();
    this.formCalc.controls.fcJuros.setValue(false);
    //this.formCalc.controls.fcJuros.disable();
    this.dataTableAbatimentos = [];
    this.dataSourceAbatimentos = new MatTableDataSource<ElementAbatimentos>();
  }

/**
 * It sums up the total of the principal, the total of the current value, the total of the corrected
 * value and the total of the interest.
 */
  public calcSumTotals(){
    this.sumTotal = 0;
    this.sumTotalCorr = 0;
    this.sumTotalAtualizado = 0;
    this.sumTotalJuros = 0;
    this.sumTotalJurosDias = 0;

    this.dados.map((x: any) => {
      this.sumTotal = this.sumTotal + x.principal;
      this.sumTotalAtualizado = this.sumTotalAtualizado + x.valorAtualizado;
      this.sumTotalCorr = this.sumTotalCorr + x.valorCorr;
      this.sumTotalJuros = this.sumTotalJuros + x.jurosValorTotal;
      this.sumTotalJurosDias = this.sumTotalJurosDias + x.juros.reduce(function(jurosDiasAcc:number, jurosCurr:any){ return jurosDiasAcc + jurosCurr.dias;}, 0);

    });
  }
  
  public checkJurosLength() {
    return this.dados.filter((e:any) => e.juros.length > 0).length;
  }

/**
 * Given two dates, return true if the first date is before the second date
 * @param {string} dtIni - The initial date to compare.
 * @param {string} dtFim - The date you want to compare to.
 * @returns Nothing.
 */
  public isDateBefore(dtIni:string, dtFim:string){
    return Date.parse(dtIni) < Date.parse(dtFim);
  }

 /**
  * It adds a new juros to the list of juros.
  */
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


  /**
   * It calculates the interest rate for a given period.
   * @param  - valorPrincipal: The value of the principal.
   * @returns The method returns a promise.
   */
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
          jurosDt = jurosDtIni > defDataCodigoCivilFim ? jurosDtIni : defDataCodigoCivilFim;
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
                jurosDt = jurosDtIni >defDataPoupancaFim ? jurosDtIni : defDataPoupancaFim;
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
    this.dataTableJuros.sort((a:any, b:any) => {
      return new Date(a.dtIni).getTime() - new Date(b.dtIni).getTime();
    });
    this.dataSourceJuros = new MatTableDataSource<ElementJuros>(this.dataTableJuros);
    onFinish && await onFinish()
    return indice ? Promise.resolve(indice) : Promise.resolve('without indice');
  }

 /**
  * It adds the data to the table abatimentos.
  */
  public setAbatimento(){
    let abatimentosData = (this.formCalc.get("fcDtAbatimento")?.value);
    let abatimentosValor = (this.formCalc.get("fcValorAbatimento")?.value);
    this.dataTableAbatimentos.push({
      data: abatimentosData,
      valor: abatimentosValor,
    });
    this.dataSourceAbatimentos = new MatTableDataSource<ElementAbatimentos>(this.dataTableAbatimentos);
  }

  /**
   * It adds a new lancamento to the lancamentos array.
   */
  /* The above code is responsible for adding the lancamento to the database. */
  /* Creating a new array called correcao. */
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

  /**
   * It adds the lancamento to the table Lancamentos.
   * @param {string} indiceOption - string,
   * @param {number} valorPrincipal - The principal amount of the loan.
   * @param {any} dtIni - The initial date of the period.
   * @param {any} dtFim - The date you want to end the calculation.
   * @param {string} descricao - string
   * @returns Nothing.
   */
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
        await this.clearForm();
        await this.sortByDtIni();
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
          await this.clearForm();
          await this.sortByDtIni();
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

/**
 * Calculate the taxa for a given taxa and number of days
 * @param {number} taxa - the taxa per dias
 * @param {number} dias - number of days between the start and end dates
 * @returns Nothing is being returned.
 */
  public calcTaxa(taxa:number, dias:number){
    return ((taxa / 360) * dias);
  }

/**
 * Calculate the accumulated taxa for a given taxa and number of days
 * @param {number} taxa - the interest rate per year.
 * @param {number} dias - number of days between payments
 * @returns Nothing
 */
  calcTaxaAcumulada(taxa:number, dias:number){
    return ((taxa * 360) / dias)
  }

/**
 * Calculate the interest on a given value, based on a tax rate and a number of days
 * @param {number} valor - the value of the loan.
 * @param {number} taxa - the percentage of the value that will be charged as interest.
 * @param {number} dias - number of days the money is invested for
 * @returns Nothing.
 */
  calcJuros(valor:number, taxa:number, dias:number){
    return this.calcTaxa(taxa, dias) * valor;
  }

/**
 * Find the index of the response that has the same date as the given date
 * @param {Date} data - Date
 * @returns The response object that has the data property equal to the date that was passed in.
 */
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

/**
 * This function sorts an array of dates in ascending order.
 * @param {any} dates - an array of dates
 * @returns An array of dates in order.
 */
  orderDatesArray(dates: any){
    let orderedDates = dates.sort(function(a: any, b: any){
      return Date.parse(a) > Date.parse(b);
    });
    return orderedDates;
  }


/**
 * It calculates the interest rate for each day of the month.
 * @param {number} valor - The value of the loan.
 * @param {any} dataJuros - an array of objects containing the following properties:
 * @returns an array of objects. Each object contains the following properties:
 */
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

/**
 * It only return the object correcao without corrections.
 * @param {number} valorPrincipal - The value of the principal.
 * @returns an object with the following properties:
 */
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

  /**
   * It calculates the correction factor for the index, the corrected value and return correcao object.
   * @param {string} indiceOption - string
   * @param {number} valorPrincipal - number, dtFim: Date
   * @param {Date} dtFim - Date
   * @returns a object with the following properties:
   */
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
    /*if (this.formCalc.get("fcIndiceLanca")?.value.includes('TJ6899') && dtFim >= indiceDataAtualizacao){
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
/**
 * The function takes the data from the response and creates a table with the data
 * @param {any} correcao - any, juros: any
 * @param {any} juros - the interest rate
 */
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

/**
 * Round a number to two decimal places
 * @param {number} number - The number to round.
 * @returns The rounded number.
 */
  roundNumber(number: number){
    return Math.round((number + Number.EPSILON) * 100) / 100;
  }

   /**
    * Efectively calculates interest and create the data object for the view 
    * @param {number} valorPrincipal - number
    * @param {Date} dtIni - Date, the start date of the period
    * @param {Date} dtFim - Date,
    * @param {string} descricao - string
    * @returns The dataSourceLanca object result of the function.
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
        /*
        let totJurosDias = 0;
        for (let i=0; i < juros.length; i++) {
          totJurosDias += juros.dias;
        }
        */
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
      valorAtualizado: this.roundNumber(correcao.valorAtualizado),
      valorCorr: this.roundNumber(correcao.valorAtualizado) + this.roundNumber(jurosValorTotal),
      correcao: (correcao.valorAtualizado + jurosValorTotal) - (valorPrincipal),
      memoria: this.dataTableRelatorio,
      juros: juros
    });
    console.log(this.dados)
    this.dataSourceLanca = new MatTableDataSource<ElementLanc>(this.dados)
  }

/**
 * It takes a date and adds a number of months to it.
 * @param {number} index - The index of the row you want to replicate.
 * @param {number} [qty=1] - number of months to add to the initial date.
 * @returns an array of dates.
 */
  public replicateDate(index:number, qty:number = 1) {
    let dtIni = this.dataSourceLanca.data[index].dtIni;
    let newDate:any = [];
    for(let i = 0; i < qty; i++){
      newDate.push(moment(dtIni).add(i, "months").format('YYYY-MM-DD')); 
    }
    return newDate;
  }

  /**
   * It changes the name of the indices to the ones used in the system.
   * @param {string} indice - The index in human readable format.
   * @returns The indice name, with the correct data format.
   */
  fixIndices(indice : string) {
    switch(indice){
      case 'SEM CORREÇÃO':
        return 'sem-correcao';
      break;
      case 'LEI 6.899/81':
        return 'TJ6899';
      break;
      case 'LEI 11.960/2009':
        return 'TJ11960';
      break;
      default:
        return indice;
      break;
    }
  }

/**
 * Sort the data by the date in ascending order
 */
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

 /**
  * It replicates a lancamento based on the index and quantity of replications.
  * @param {number} index - The index of the lancamento to replicate.
  * @param {number} [qty=1] - number of replications to be created
  */
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
        
    /* Generator function that will add a replica to the replica set. */
    function* addReplication() {
      let index = 0;
      while(index <= replicaSet.length) {
        yield index++
      }
    }

    const generator = addReplication()
  /**
   * It applies the replication of the lancamentos.
   */
    const applyReplication = async () => {
      const indiceLancamento = generator.next().value 
      const lancamento = replicaSet[indiceLancamento as number]
      
      if (lancamento !== undefined) {
        try {
          if(lancamento.juros.length){
            let { dtIni: jurosDtIni, dtFim: jurosDtFim, valorPrincipal, jurosIndice, jurosTaxa} = lancamento.juros[0];
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

/**
 * Clear the data table and the juros data source
 */
  async clearJurosData(){
    this.dataTableJuros = [];
    this.dataSourceJuros = new MatTableDataSource<ElementJuros>();
  }

/**
 * It downloads the report as a PDF file.
 * @param {string} id - The id of the report to download.
 */
  downloadAsPDF(id: string){
    report.downloadAsPDF(id, this.myFormattedDate, '/assets/imgs/LOGO_MPRJ_GATE.png');
  }

/**
 * The function takes in a string id, a string date, a string path to the logo, and a string format. 
 * The function then calls the report.makePDF function with the id, date, path, and format. 
 * @param {string} id - The id of the element to be displayed on the report.
 */
  makePDF(id: any){
    let date = this.myFormattedDate;
    let headerImg = '/assets/imgs/LOGO_MPRJ_GATE.png';
    let format = 'p';
    let url = location.protocol+'//'+location.hostname+"/?calculo="+this.token
    if (this.sumTotal.toString().length >= 9 && this.sumTotalAtualizado.toString().length >= 9){
      format = 'l';	
    }
    report.makePDF({id, date, headerImg, format, url});
  }

/**
 * Prints the HTML of the element with the given id
 * @param {string} id - The id of the element to print.
 */
  printHtml(id: string){
    report.printHtml(id);
  }


  
  public saveCalc(){
    this.service.pushSaveCalc(this.dados).subscribe((res) => {    
        this.token = res
        //this.getExcel(this.token)
    }
    );
  }

  /**
  * Get json from service and load calculation to the view
  * @param {string} token - the calculation token
  */
  public getJsonCalc(token:string){
    this.service.getJsonCalc(token).subscribe((res) => {
      this.dados = res;
      this.dataSourceLanca = new MatTableDataSource<ElementLanc>(this.dados);
      this.calcSumTotals();
    });
  }

  //public getExcel(token: string){    
  public getExcel(){ 
    let token = this.token;
    this.service.getExcel(token).subscribe((x) => {
      const newBlob = new Blob([x], { type: "application/xls" });      
      const downloadURL = window.URL.createObjectURL(x);
      const link = document.createElement("a");
      link.href = downloadURL;      
      let newstr = "Relatorio_Calculei_" + new Date().getTime() + ".xls";
      link.download = newstr;
      link.click();
      window.URL.revokeObjectURL(downloadURL);
      link.remove();
    });
    //this.service.pushSaveCalc(this.dados)
  }

}