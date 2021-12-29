public with sharing class AccountFileMultiUpload {
      public class relatedFile {
        public String PathOnClient;
        public String Title;
        public Blob VersionData;
        public String Type;
        public String otherInputValue;
        public Boolean showOtherInput;
    }

    @AuraEnabled
    public static boolean uploadFiles(List<Map<String, Object>> files,String recordId){
        system.debug('##files='+files);
        Boolean isSuccess = false;
        system.debug('UploadFiles');
        List<Attachment> attachmentsToInsert = new List<Attachment>();
        //List<ContentVersion> relatedDocuments = new List<ContentVersion>();
        for (Map<String, Object> file : files) {
            String fileJson = JSON.serialize(file);
            relatedFile relatedDocument = (relatedFile) JSON.deserialize(fileJson, relatedFile.class);
            system.debug('###relatedDocument'+relatedDocument);
            /*ContentVersion contentVersionFile = new ContentVersion();
            contentVersionFile.PathOnClient = relatedDocument.PathOnClient;
            contentVersionFile.Title = relatedDocument.Title;
            contentVersionFile.VersionData = relatedDocument.VersionData;*/
            attachment att = new attachment();
            att.name= relatedDocument.Title;
            if( relatedDocument.Type == 'Others' ){
                String fileTitle = relatedDocument.Title;
                List<String> listOfString = fileTitle.split('\\.');
                if( String.isNotBlank(relatedDocument.otherInputValue) && listOfString.size()>1 ){
                    att.name= relatedDocument.otherInputValue + '.' + listOfString[1];
                }
            }
            att.body = relatedDocument.VersionData;
            att.contenttype = relatedDocument.Type;
            att.parentid = recordId;
            

            attachmentsToInsert.add(att);
        }
        Database.saveResult[] srFiles = Database.insert(attachmentsToInsert);
        for (Database.SaveResult saveResult : srFiles) {
            isSuccess = saveResult.isSuccess();
        }
        return isSuccess;
    }
}