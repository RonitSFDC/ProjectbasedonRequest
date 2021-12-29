import { LightningElement, api, track, wire } from 'lwc';
import prepareDocumentData from '@salesforce/apex/FileUplaodSecurityClearanceController.prepareDocumentData';
import uploadFile from '@salesforce/apex/FileUplaodSecurityClearanceController.uploadFile';
import OPPTY_ACC_NAME from '@salesforce/schema/Opportunity.Account.Name';
import OPPTY_ACC_ID from '@salesforce/schema/Opportunity.Account.Id';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import {NavigationMixin} from 'lightning/navigation'

const fields = [OPPTY_ACC_NAME, OPPTY_ACC_ID];

export default class FileUploadecurityClearance extends NavigationMixin(LightningElement) {

  @track fileLists = [];
  @api recordId;
  isClose = false;
  loadDataCalled = false;
  error;
  fileData;
  documentNameForFile;
  isShowModal = false;

  renderedCallback(){
    console.log('Inside Rendered', this.loadDataCalled);
    if(!this.loadDataCalled){
        this.loadData();
        this.loadDataCalled = true;
    }
  }

  @wire(getRecord, { recordId: '$recordId', fields })
    account;

    get name() {
        return getFieldValue(this.account.data, OPPTY_ACC_NAME);
    }
    get accId() {
      return getFieldValue(this.account.data, OPPTY_ACC_ID);
  }

  loadData() {
    prepareDocumentData({ oppRec : this.recordId })
    .then(result=> {
      this.fileLists = result.lstDocumentWrap;
      console.log('File list before for each',this.fileLists);
      this.fileLists.forEach(item=> {
          if(item.docStatus === 'Uploaded') {
              item.isPreview = true;
          }
          else if(item.docStatus === 'Pending Upload') {
              item.isPreview = false;
          }
      });
      console.log('File list after for each',this.fileLists);
      return this.fileLists;
    })
    .catch(error=> {
      this.error = error;
    });
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
      uploadFile({ base64, filename, recordId,  commentFile: this.commentsFile, strDocName: this.documentNameForFile}).then(result=>{
        console.log('Content DocumentLink ',result);
        this.fileData = null;
        this.showToast('Success', 'Success', `${filename} uploaded successfully!!`);
    })
    this.isClose = true;
  }
  handleRepalce(event) {
    const itemIndex = event.currentTarget.dataset.index;
    const rowData = this.fileLists[itemIndex];
    this.documentNameForFile = rowData.documentName;
    console.log('Data row ',rowData);
    this.isClose = false;
    this.isShowModal = true;
  }
  handleClose() {
    if(this.isClose === true) {
      this.loadDataCalled = false;
    } 
      this.isShowModal = false;
  }
  handleUpload(event) {
    const itemIndex = event.currentTarget.dataset.index;
    const rowData = this.fileLists[itemIndex];
    console.log('Data row ',rowData.documentName);
    this.documentNameForFile = rowData.documentName;
    this.isClose = false;
    this.isShowModal = true;
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

  previewHandler(event){
    console.log(event.target.dataset.id)
    this[NavigationMixin.Navigate]({ 
        type:'standard__namedPage',
        attributes:{ 
            pageName:'filePreview'
        },
        state:{ 
            selectedRecordId: event.target.dataset.id
        }
    })
}
}