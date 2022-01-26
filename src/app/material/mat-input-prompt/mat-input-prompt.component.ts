import { Component, OnInit, Inject, EventEmitter, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators, NgForm, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-mat-input-prompt',
  templateUrl: './mat-input-prompt.component.html',
  styleUrls: ['./mat-input-prompt.component.scss']
})
export class MatInputPromptComponent implements OnInit {

  title = '';
  form: FormGroup;
  inputs: any;
  params: any;
  results: any;

  parentFunction = new EventEmitter();

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<MatInputPromptComponent>,
    @Inject(MAT_DIALOG_DATA) data: { title: string, form: any, inputs: any, params: any },
  ) { 
    this.title = data ? data.title : '';
    this.form = this.fb.group({...data.form});
    this.inputs = {...data.inputs};
  }

  ngOnInit(): void {
  }

  onChange(form: NgForm) {
    this.results = this.params.parentFunction(form);
  }

  submit(form: NgForm) {
    this.dialogRef.close({
      clicked: 'submit',
      form: form
    });
  }



}
