import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';


@Component({
  selector: 'app-mat-alert',
  templateUrl: './mat-alert.component.html',
  styleUrls: ['./mat-alert.component.scss']
})
export class MatAlertComponent implements OnInit {

   title: string = 'Atenção!';
   message: string = '';

  constructor(private dialogRef: MatDialogRef<MatAlertComponent>,
    @Inject(MAT_DIALOG_DATA) data: { title: string, message: string }) {
    this.title = data ? data.title : '';
    this.message = data ? data.message : '';
  }

  ngOnInit(): void {
  }

  closeAlert() {
    this.dialogRef.close();
  }


}
