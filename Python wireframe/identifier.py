#identifier function uses the input in the wireframe to find a match or groups of matches in the connected database

import os, re
import tkinter as tk
from tkinter import filedialog

def identifyFile(a, data):
    listVIN = []
    listBrand = []
    listModel = []
    listYear = []
    listRegistry = []
    #uses a file with data to find info on the car
    registry = r'^[A-Z]{2}\s\d{4}-(\d{2}|[A-Z])$'
    if os.path.exists(data):
        try:
            with open(data, 'r') as file:
                info = file.readlines()
            
        except FileNotFoundError:
            print('File not found')
        
    
    else:
        print ('Data cannot be searched for') #in the situation where the file does not exist
    
    for aline in info[1:]:
        values = aline.strip().split(', ')
        listVIN.append(values[0])
        listBrand.append(values[1])
        listModel.append(values[2])
        listYear.append(values[3])
        listRegistry.append(values[4])
        #split and store the data.

    def valuesList(w,x,y,z):
        carDetails = []
        if len(w) == len(x) == len(y) == len(z):
            for i in range(len(x)):
                deet = [w[i],x[i], y[i], z[i]]
                carDetails.append(deet)
            return carDetails
        
        else:
            return 'Data is missing'

    dictValue = valuesList(listBrand, listModel, listYear, listRegistry)   

    def createDict(x, y): #x = vin list, y = dictValue
        dataDict = {}
        dataDiff = len(x) - len(y)
        if dataDiff == 0:
            for i in range(len(x)):
                dataDict[x[i]] = y[i]
                sortedDataDict = dict(sorted(dataDict.items(), key=lambda x: x[0]))
            return sortedDataDict #creates an ordered key-value pair of VIN and corresponding data
        elif dataDiff > 0:
            return f'{dataDiff} Data is missing'
        elif dataDiff < 0:
            return f'{abs(dataDiff)} Data is extra'



    


    
    if isinstance(a, str): #checks vin number
        if re.match(registry, a): #checks for licence plate
            def dataFound(a):
                b = createDict(listVIN, dictValue)
                dMatch = {}
                for key, value in b.items():
                    if a in value:
                        dMatch[key] = b[key]
                return dMatch
            
            neccData = dataFound(a)
            return neccData
        
        elif len(a)>5:
            def dataFound(a):
                b = createDict(listVIN, dictValue)
                dMatch = {}
                for key in b:
                    if a in str(key):
                        dMatch[key] = b[key]
                return dMatch 

            neccData = dataFound(a)

            return neccData
    
    elif len(a)<5:
            return 'Not enough data to search for enough to search for'

    elif isinstance(a, list):

        return neccData
        
    else:
        return 'Invalid data type'


# def identifyDB():
#     #uses a database to find info on the car

def fileInput(): #this is the file input

    root = tk.Tk()
    # root.withdraw()

    root.update()
    # Open file browser
    file_path = filedialog.askopenfilename(title="Select a file")
    root.destroy()

    data = file_path
    return data

x = fileInput()
y = identifyFile('R9FGBTL4VA63EUPNM', x)
z = identifyFile('UE 5720-14', x)

if y == z:
    print('Calm down it is working')
    print(y, z)
else:
    print('wake up nigga check it again')