import { Component, OnInit, ViewChild, ElementRef,Injectable } from '@angular/core';
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


import  { responseIndice } from '../model/responseIndice.model'
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
    // Juros
    fcDtIniJuros: new FormControl(""),
    fcDtFimJuros: new FormControl(""),
    fcValorJuros: new FormControl(""),
    fcIndiceJuros: new FormControl(""),
    fcPeriodoJuros: new FormControl(""),


  })
  // @ViewChild('htmlData') htmlData:ElementRef;

  dados: any = [];

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
    "check",
  ];

  displayedColumnsF = ['indice', 'valor'];
  

  ngOnInit(): void {
    console.log("OOOO", this.dataSourceJuros.data.length)
    console.log("OOOO", this.dataSourceLanca.data.length)
  }


  public difDays() {
    let dt1;
    let dt2;
    if (this.formCalc.get("fcDtIniLanca")?.value != "" && this.formCalc.get("fcDtFimLanca")?.value != "") {
      dt1 = new Date(this.formCalc.get("fcDtIniLanca")?.value);
      dt2 = new Date(this.formCalc.get("fcDtFimLanca")?.value);
      return Math.floor((Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate()) - Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate())) / (1000 * 60 * 60 * 24));
    } else {
      return 0
    }


  }


  public addTbl() {
    console.log("Entrou")//let dados = [];
    
   // console.log('evente', evento)
    const evento = this.formCalc.get("fcIndiceLanca")?.value;
    var datePipe = new DatePipe('pt-br');
    const dat = responseIndice;
    const data_ini =  datePipe.transform( this.formCalc.get('fcDtIniLanca')?.value, 'dd-MM-YYYY');
    const data_fim = datePipe.transform( this.formCalc.get('fcDtFimLanca')?.value, 'dd-MM-YYYY');

    console.log('DT INI', data_ini)
    console.log('DT FIM', data_fim)

    this.service.getIndice(evento, data_ini , data_fim).subscribe((res: any) => {
      this.ResponseIndice = res.content
      console.log('Json',res);            
      this.setCalc(res.content);
    })

    
    // this.dataSource = new MatTableDataSource<Element>(this.dataTable);
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


    pdfMake.createPdf(docDefinition).open({}, window);

    

  }
  /*

  */


  public getValue(evento: string) {

    console.log('evente', evento)
    var datePipe = new DatePipe('pt-br');
    const dat = responseIndice;
    const data_ini =  datePipe.transform( this.formCalc.get('fcDtIniLanca')?.value, 'dd-MM-YYYY');
    const data_fim = datePipe.transform( this.formCalc.get('fcDtFimLanca')?.value, 'dd-MM-YYYY');

    console.log('DT INI', data_ini)
    console.log('DT FIM', data_fim)

    this.service.getIndice(evento, data_ini , data_fim).subscribe((res: any) => {
      this.ResponseIndice = res.content
      console.log('Json',res);            
      this.setCalc(res.content);
    })
      
    

  }
  setCalc(data: any){
    let maior = 0
    
    let day = this.difDays()
    let respIndice;

    data.map((x:any)=>{
      if(x.acumulado > maior ){
        maior = x.acumulado
        respIndice = x.nome;
      }
    
    })
    
    
    console.log("respIndice",respIndice)
    this.dados.push({
      dtIni: this.formCalc.get("fcDtIniLanca")?.value,
      dtFim: this.formCalc.get("fcDtFimLanca")?.value,
      indice: respIndice,
      dias: day,
      valor: maior * this.formCalc.get("fcValorLanca")?.value
    });
    //this.dataTableJuros = dados;
    this.dataTableLanca = this.dados
    //console.log("DDDDD", dados)
    //console.log("dataTableJuros", this.dataTableLanca)
    this.dataSourceLanca = new MatTableDataSource<ElementLanc>(this.dataTableLanca)
  }
  public getIgpm(evento: string) {

    console.log('evente', evento)
    // debugger
    this.service.getIgmp().subscribe((res: any) => {
      console.log(res._embedded);
    })
  }


}
export interface Element {
  dtIni: Date;
  position: number;
  dtFim: Date;
  indice: string;
  dias: number;
  valor:number
}
export interface ElementLanc {
  dtIni: Date;
  position: number;
  dtFim: Date;
  indice: string;
  dias: number;
  valor: number
  
}