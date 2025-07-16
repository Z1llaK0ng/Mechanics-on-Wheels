#identifier function uses the input in the wireframe to find a match or groups of matches in the connected database

import os
import tkinter as tk
from tkinter import filedialog

def identifyFile(a, data):
    listVIN = []
    listBrand = []
    listModel = []
    listYear = []
    #uses a file with data to find info on the car
    
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
        #split and store the data.

    def valuesList(x,y,z):
        carDetails = []
        if len(x) == len(y) == len(z):
            for i in range(len(x)):
                deet = [x[i], y[i], z[i]]
                carDetails.append(deet)
            return carDetails
        
        else:
            return 'Data is missing'

    dictValue = valuesList(listBrand, listModel, listYear)   

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

    def dataFound(a):
        b = createDict(listVIN, dictValue)
        match = {}
        for key in b:
            if a in str(key):
                match[key] = b[key]
        return match 

    neccData = dataFound(a)

    if isinstance(a, str) and len(a)>= 5:
        return neccData
    
    elif isinstance(a, str) and len(a)<5:
        return 'Not  data to search for enough to search for'

    elif isinstance(a, list):
        return neccData
        
    else:
        return 'Invalid data type'


# def identifyDB():
#     #uses a database to find info on the car

def fileInput():

    root = tk.Tk()
    root.withdraw()

    # Open file browser
    file_path = filedialog.askopenfilename(title="Select a file")

    data = file_path
    return data