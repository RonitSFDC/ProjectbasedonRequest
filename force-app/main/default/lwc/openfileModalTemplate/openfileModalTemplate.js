import { api, LightningElement } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import uploadFile from '@salesforce/apex/FileUplaodSecurityClearanceController.uploadFile';
export default class OpenfileModalTemplate extends LightningElement {
  
  @api documentName; 
  @api loadDataCalled;
  @api accId;
  isShowModal = false;
  fileData;
  commentsFile;

  @api
  show() {
      this.isShowModal = true;
  }
  @api
  hide() {
      this.isShowModal = false;
      this.loadDataCalled = false;
      this.documentName = '';
  }
  openfileUpload(event) {
    const file = event.target.files[0]
    let reader = new FileReader();
    reader.onload = () => {
        let base64 = reader.result.split(',')[1];
        this.fileData = {
            'filename': file.name,
            'base64': base64,
            'recordId': this.accId
        }
        console.log('File Data ',this.fileData);
    }
    reader.readAsDataURL(file);
}
handleSave() {
    const {base64, filename, recordId} = this.fileData;
    uploadFile({ base64, filename, recordId,  commentFile: this.commentsFile}).then(result=>{
      this.fileData = null;
      this.showToast('Success', 'Success', `${filename} uploaded successfully!!`);
  })
  //this.hide();
}

showToast(type, title, message) {
  const evt = new ShowToastEvent({
      title: title,
      message: message,
      variant: type,
  });
  this.dispatchEvent(evt);
  }

  handleComments(event) {
      this.commentsFile = event.target.value;
  }
}