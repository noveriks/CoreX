try {
    $interfaces = Get-ChildItem "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces" -ErrorAction Stop

    foreach ($interface in $interfaces) {
        $path = $interface.PSPath
        Set-ItemProperty -Path $path -Name "TcpAckFrequency" -Value 1 -Type DWord -ErrorAction SilentlyContinue
        Set-ItemProperty -Path $path -Name "TCPNoDelay" -Value 1 -Type DWord -ErrorAction SilentlyContinue
    }

    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpAckFrequency" -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TCPNoDelay" -Value 1 -Type DWord -ErrorAction SilentlyContinue
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "TcpDelAckTicks" -Value 0 -Type DWord -ErrorAction SilentlyContinue

    Write-Host "Nagle's Algorithm disabled on all interfaces"
} catch {
    Write-Host "Failed to disable Nagle's Algorithm: $_"
}
