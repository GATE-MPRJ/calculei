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


import { responseIndice } from '../model/responseIndice.model'
import { Observable } from 'rxjs';

@Injectable()
@Component({
  selector: 'app-calc',
  templateUrl: './calc.component.html',
  styleUrls: ['./calc.component.scss']
})


export class CalcComponent implements OnInit {

  constructor(public service: CalcService) { }
  //  public users: User[] = [];

  public formCalc = new FormGroup({
    //Lançmentos
    fcLancametos: new FormControl(""),
    fcDtIniLanca: new FormControl(""),
    fcDtFimLanca: new FormControl(""),
    fcValorLanca: new FormControl(""),
    fcIndiceLanca: new FormControl(""),
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
  dataTableLanca = [];
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


  days360(dateA: any, dateB: any) {
    //var dateA = new Date(this.formCalc.get("fcDtIniLanca")?.value);
    //var dateB = new Date(this.formCalc.get("fcDtFimLanca")?.value);

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

    if(dayA == 31){
      dayA = 30;
    }  
    if(dayB == 31){
      dayB = 30;
    }  
    
    var days = ((dateB.getFullYear() - dateA.getFullYear()) * 360) + (((dateB.getMonth() + 1) - (dateA.getMonth() + 1)) * 30) + (dayB - dayA);
    return days ;
  }

  lastDayOfFebruary(date: any) {

    var lastDay = new Date(date.getFullYear(), 2, 1);
    console.log("Last Dau", lastDay)
    return date.getDate() == lastDay;
  }

  

  public addTbl() {
    
    const evento = this.formCalc.get("fcIndiceLanca")?.value;
    moment.locale('pt-BR');
    const dat = responseIndice;    

    let data_ini = "" 
    let data_fim = ""    
    
    let dt1 = (this.formCalc.get("fcDtIniLanca")?.value);
    let dt2 = (this.formCalc.get("fcDtFimLanca")?.value);

    data_ini = moment(dt1).format('DD-MM-YYYY');
    data_fim = moment(dt2).format('DD-MM-YYYY');    

    this.service.getIndice(evento, data_ini?.toString(), data_fim?.toString()).subscribe((res: any) => {
      this.ResponseIndice = res.content      
      this.setCalc(res.content);
    })
    
  }



  public openPDF(): void {
    const data = this.datahoje.toString();
    const docDefinition = {

      content: [
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 100, '*'],
            body: [
              ['First', 'Second', 'Third', 'Последняя'],
              ['Value 1', 'Value 2', 'Value 3', 'Value 4'],
              [{ text: 'Bold value', bold: true }, 'Val 2', 'Val 3', 'Чё']
            ]
          },
        },
        { qr: 'text in QR' }
      ],
      /*
      footer: function(currentPage, pageCount) { 
        return [
          { text: currentPage.toString() + ' of ' + pageCount + '\n' + data, alignment: (currentPage % 2) ? 'center' : 'right'  }
        ]
      },
      */
      info: {
        title: 'Calculo Judicial',
        author: 'Anderson Pires Valgas',
        keywords: 'keywords for document',

      }
    };


    pdfMake.createPdf(docDefinition).open({});



  }
  /*

    
  public getValue(evento: string) {
    
    console.log('evente', evento)
    var datePipe = new DatePipe('pt-br');
    const dat = responseIndice;
    const data_ini = datePipe.transform(this.formCalc.get('fcDtIniLanca')?.value, 'dd-MM-YYYY');
    const data_fim = datePipe.transform(this.formCalc.get('fcDtFimLanca')?.value, 'dd-MM-YYYY');

    console.log('DT INI', data_ini?.toString())
    console.log('DT FIM', data_fim?.toString())

    this.service.getIndice(evento, data_ini?.toString(), data_fim?.toString()).subscribe((res: any) => {
      this.ResponseIndice = res.content
      console.log('Json', res);
      this.setCalc(res.content);
    })
  }

  */

  setCalc(data: any) {
    let maior = 0
    let dtIni = "";
    let dtFim = "";
    let Juros = 0
    let days2003 = 0

    dtIni = this.formCalc.get("fcDtIniLanca")?.value;
    dtFim = this.formCalc.get("fcDtFimLanca")?.value;

    // Função para calcular calcular juros anteriores a 2003
    if(dtIni < "2003-01-10"){
      console.log("menor");
      console.log("Diif",this.days360(dtIni,"2003-01-10"));
      let dd = (((0.06)/360) * this.days360(dtIni,"2003-01-10") );
      dd = dd 
      Juros = (dd + 1) * this.formCalc.get("fcValorLanca")?.value
      //console.log("DDD", dd );
      console.log("Juros", Juros );
    }
    // Função para calcular calcular juros posteriores a 2003
    if(dtIni > "2003-01-10"){      
      //console.log("Diif",this.days360(dtIni,dtFim));
      let dd = (((0.12)/360) * this.days360(dtIni,dtFim) );
      dd = dd 
      Juros = (dd ) * this.formCalc.get("fcValorLanca")?.value
      console.log("DDD", dd );
      console.log("Juros", Juros );
      
    }


    let day = this.days360(dtIni,dtFim);    
    let respIndice;
    
    //console.log('dtIni', dtIni)
    //console.log('dtDim', dtFim)
    

    let total = 0;
    let total2 = 0;
    data.map((x: any) => {
      total = total + x.valor;
      if (x.acumulado > maior) {
        maior = x.acumulado;
        respIndice = x.nome;
    
      }

    })
    console.log("Juros", Juros );
    this.dados.push({
      dtIni: dtIni,
      dtFim: dtFim,
      indice: respIndice,
      dias: day,
      valor:  this.formCalc.get("fcValorLanca")?.value, 
      juros: Juros,
      valorCorr: (maior * this.formCalc.get("fcValorLanca")?.value) + Juros
    });
    
    this.dataTableLanca = this.dados
    this.dataSourceLanca = new MatTableDataSource<ElementLanc>(this.dataTableLanca)

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